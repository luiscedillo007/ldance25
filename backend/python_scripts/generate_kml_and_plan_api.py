import sys
import json
import math
import pymap3d as pm
import xml.etree.ElementTree as ET
import re
import tempfile
import os
from typing import List, Dict, Any, Optional

# pip install pymap3d
# pip install geographiclib

try:
    from geographiclib.geoid import Geoid
    GEOID = Geoid("egm96-5")
except Exception:
    GEOID = None


def body_to_enu_forward_left(x, y, heading_deg):
    psi = math.radians(heading_deg)
    E = math.sin(psi) * x - math.cos(psi) * y
    N = math.cos(psi) * x + math.sin(psi) * y
    return E, N


def enu_from_local(x, y, mode="east", heading_deg=0.0):
    m = (mode or "east").lower()
    if m == "east":
        return x, y
    if m == "north":
        return y, x
    if m == "heading":
        return body_to_enu_forward_left(x, y, heading_deg)
    raise ValueError("mode must be 'east', 'north', or 'heading'")


def waypoints_local_to_geodetic_agl(waypoints_xyz, lat0_deg, lon0_deg, ground_msl_m, local_xy_mode="east", heading_true_deg=0.0):
    out = []
    if GEOID is not None:
        h0_ell = ground_msl_m + GEOID.Height(lat0_deg, lon0_deg)
    else:
        h0_ell = ground_msl_m
    for (x, y, z_agl) in waypoints_xyz:
        E, N = enu_from_local(x, y, mode=local_xy_mode, heading_deg=heading_true_deg)
        lat, lon, _h = pm.enu2geodetic(E, N, 0.0, lat0_deg, lon0_deg, h0_ell)
        alt_rel = float(z_agl)
        alt_amsl = ground_msl_m + alt_rel
        out.append((lat, lon, alt_amsl, alt_rel))
    return out


def build_items_only_kml(lat0_deg, lon0_deg, ground_msl_m):
    header = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
 <Document>
  <name>QGroundControl Plan KML</name>
  <open>1</open>
  <Style id="BalloonStyle">
   <BalloonStyle>
    <text>$[description]</text>
   </BalloonStyle>
  </Style>
  <Style id="MissionLineStyle">
   <LineStyle>
    <color>ff1c78be</color>
    <width>4</width>
   </LineStyle>
  </Style>
  <Style id="SurveyPolygonStyle">
   <PolyStyle>
    <color>7f008000</color>
   </PolyStyle>
   <LineStyle>
    <color>7f008000</color>
   </LineStyle>
  </Style>
  <Folder>
   <name>Items</name>"""
    ground = f"""
   <Placemark>
    <name>0 </name>
    <styleUrl>#BalloonStyle</styleUrl>
    <description><![CDATA[Index: 0
Waypoint
Alt AMSL: {ground_msl_m:.2f} m
Alt Rel: 0.00 m
Lat: {lat0_deg:.7f}
Lon: {lon0_deg:.7f}
]]></description>
    <Point>
     <altitudeMode>absolute</altitudeMode>
     <coordinates>{lon0_deg:.7f},{lat0_deg:.7f},{ground_msl_m:.2f}</coordinates>
     <extrude>1</extrude>
    </Point>
   </Placemark>"""
    footer = """
  </Folder>
 </Document>
</kml>"""
    return header + ground + footer


def build_qgc_plan_kml(lat0_deg, lon0_deg, ground_msl_m, takeoff_lat, takeoff_lon, takeoff_amsl_m, takeoff_rel_m, waypoint_geodetic_list, repeat_takeoff_in_path=True):
    header = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
 <Document>
  <name>QGroundControl Plan KML</name>
  <open>1</open>
  <Style id="BalloonStyle">
   <BalloonStyle>
    <text>$[description]</text>
   </BalloonStyle>
  </Style>
  <Style id="MissionLineStyle">
   <LineStyle>
    <color>ff1c78be</color>
    <width>4</width>
   </LineStyle>
  </Style>
  <Style id="SurveyPolygonStyle">
   <PolyStyle>
    <color>7f008000</color>
   </PolyStyle>
   <LineStyle>
    <color>7f008000</color>
   </LineStyle>
  </Style>
  <Folder>
   <name>Items</name>"""

    def placemark(idx, is_takeoff, lat, lon, alt_amsl, alt_rel):
        name = f"{idx} Takeoff" if is_takeoff else f"{idx} "
        title = "Takeoff" if is_takeoff else "Waypoint"
        return f"""
   <Placemark>
    <name>{name}</name>
    <styleUrl>#BalloonStyle</styleUrl>
    <description><![CDATA[Index: {idx}
{title}
Alt AMSL: {alt_amsl:.2f} m
Alt Rel: {alt_rel:.2f} m
Lat: {lat:.7f}
Lon: {lon:.7f}
]]></description>
    <Point>
     <altitudeMode>absolute</altitudeMode>
     <coordinates>{lon:.7f},{lat:.7f},{alt_amsl:.2f}</coordinates>
     <extrude>1</extrude>
    </Point>
   </Placemark>""".rstrip()

    items_xml = []
    items_xml.append(placemark(0, False, lat0_deg, lon0_deg, ground_msl_m, 0.0))
    items_xml.append(placemark(1, True, takeoff_lat, takeoff_lon, takeoff_amsl_m, takeoff_rel_m))
    idx = 2
    for (lat, lon, alt_amsl, alt_rel) in waypoint_geodetic_list:
        items_xml.append(placemark(idx, False, lat, lon, alt_amsl, alt_rel))
        idx += 1

    folder_close = """
  </Folder>"""

    coords = [
        f"{lon0_deg:.7f},{lat0_deg:.7f},{ground_msl_m:.2f}",
        f"{takeoff_lon:.7f},{takeoff_lat:.7f},{takeoff_amsl_m:.2f}",
    ]
    if repeat_takeoff_in_path:
        coords.append(f"{takeoff_lon:.7f},{takeoff_lat:.7f},{takeoff_amsl_m:.2f}")
    for (lat, lon, alt_amsl, _alt_rel) in waypoint_geodetic_list:
        coords.append(f"{lon:.7f},{lat:.7f},{alt_amsl:.2f}")
    coords_str = "\n".join(coords)

    path_xml = f"""
  <Placemark>
   <styleUrl>#MissionLineStyle</styleUrl>
   <name>Flight Path</name>
   <visibility>1</visibility>
   <LookAt>
    <latitude>{lat0_deg:.7f}</latitude>
    <longitude>{lon0_deg:.7f}</longitude>
    <altitude>{ground_msl_m:.2f}</altitude>
    <heading>-100</heading>
    <tilt>45</tilt>
    <range>2500</range>
   </LookAt>
   <LineString>
    <extruder>1</extruder>
    <tessellate>1</tessellate>
    <altitudeMode>absolute</altitudeMode>
    <coordinates>{coords_str}
</coordinates>
   </LineString>
  </Placemark>"""

    footer = """
 </Document>
</kml>"""
    return header + "\n".join(items_xml) + folder_close + path_xml + footer


class KMLToPlanConverter:
    def __init__(self):
        self.kml_namespace = {'kml': 'http://www.opengis.net/kml/2.2'}
        
    def parse_kml_description(self, description: str) -> Dict[str, Any]:
        """Parse the description field from KML placemark"""
        info = {}
        
        # Extract index
        index_match = re.search(r'Index:\s*(\d+)', description)
        info['index'] = int(index_match.group(1)) if index_match else 0
        
        # Extract type (Waypoint, Takeoff, etc.)
        lines = description.strip().split('\n')
        if len(lines) > 1:
            info['type'] = lines[1].strip()
        else:
            info['type'] = 'Waypoint'
            
        # Extract altitudes
        amsl_match = re.search(r'Alt AMSL:\s*([\d.]+)\s*m', description)
        rel_match = re.search(r'Alt Rel:\s*([\d.]+)\s*m', description)
        
        info['alt_amsl'] = float(amsl_match.group(1)) if amsl_match else 0.0
        info['alt_rel'] = float(rel_match.group(1)) if rel_match else 0.0
        
        # Extract coordinates
        lat_match = re.search(r'Lat:\s*([\d.-]+)', description)
        lon_match = re.search(r'Lon:\s*([\d.-]+)', description)
        
        info['lat'] = float(lat_match.group(1)) if lat_match else 0.0
        info['lon'] = float(lon_match.group(1)) if lon_match else 0.0
        
        return info
    
    def get_mavlink_command(self, waypoint_type: str, index: int) -> int:
        """Convert waypoint type to MAVLink command number"""
        waypoint_type = waypoint_type.lower()
        
        if 'takeoff' in waypoint_type:
            return 22  # MAV_CMD_NAV_TAKEOFF
        elif 'land' in waypoint_type:
            return 21  # MAV_CMD_NAV_LAND
        elif 'waypoint' in waypoint_type or waypoint_type.strip() == '':
            return 16  # MAV_CMD_NAV_WAYPOINT
        else:
            return 16  # Default to waypoint
    
    def create_mission_item(self, waypoint_info: Dict[str, Any], is_first: bool = False) -> Dict[str, Any]:
        """Create a mission item from waypoint information"""
        command = self.get_mavlink_command(waypoint_info['type'], waypoint_info['index'])
        
        item = {
            "AMSLAltAboveTerrain": None,
            "Altitude": waypoint_info['alt_rel'],
            "AltitudeMode": 1,  # Relative altitude
            "autoContinue": True,
            "command": command,
            "doJumpId": waypoint_info['index'] + 1,
            "frame": 3,  # MAV_FRAME_GLOBAL_RELATIVE_ALT
            "params": [
                0,  # Hold time (seconds)
                0,  # Acceptance radius (meters)
                0,  # Pass through waypoint
                None,  # Yaw angle
                waypoint_info['lat'],
                waypoint_info['lon'],
                waypoint_info['alt_rel']
            ],
            "type": "SimpleItem"
        }
        
        return item
    
    def create_rtl_item(self, last_index: int) -> Dict[str, Any]:
        """Create Return to Launch item"""
        return {
            "autoContinue": True,
            "command": 20,  # MAV_CMD_NAV_RETURN_TO_LAUNCH
            "doJumpId": last_index + 1,
            "frame": 2,  # MAV_FRAME_MISSION
            "params": [0, 0, 0, 0, 0, 0, 0],
            "type": "SimpleItem"
        }
    
    def parse_kml_string(self, kml_content: str) -> List[Dict[str, Any]]:
        """Parse KML content string and extract waypoint information"""
        root = ET.fromstring(kml_content)
        
        waypoints = []
        
        # Find all placemarks in the Items folder
        items_folder = root.find('.//{http://www.opengis.net/kml/2.2}Folder[{http://www.opengis.net/kml/2.2}name="Items"]')
        if items_folder is not None:
            placemarks = items_folder.findall('.//{http://www.opengis.net/kml/2.2}Placemark')
            
            for placemark in placemarks:
                description_elem = placemark.find('{http://www.opengis.net/kml/2.2}description')
                if description_elem is not None:
                    description = description_elem.text
                    waypoint_info = self.parse_kml_description(description)
                    waypoints.append(waypoint_info)
        
        # Sort waypoints by index to ensure correct order
        waypoints.sort(key=lambda x: x['index'])
        return waypoints
    
    def convert_kml_to_plan(self, kml_content: str) -> Dict[str, Any]:
        """Convert KML content string to QGroundControl .plan format"""
        waypoints = self.parse_kml_string(kml_content)
        
        if not waypoints:
            raise ValueError("No waypoints found in KML content")
        
        # Find home position (usually the first waypoint or one marked as home)
        home_waypoint = waypoints[0]
        home_position = [
            home_waypoint['lat'],
            home_waypoint['lon'],
            home_waypoint['alt_amsl']
        ]
        
        # Create mission items
        mission_items = []
        
        # Skip the first waypoint if it's a home position (command would be different)
        start_index = 0
        if waypoints[0]['type'].lower() in ['waypoint', ''] and waypoints[0]['alt_rel'] == 0:
            start_index = 1  # Skip home position waypoint
        
        for i, waypoint in enumerate(waypoints[start_index:], start_index):
            item = self.create_mission_item(waypoint, i == start_index)
            mission_items.append(item)
        
        # Add Return to Launch item
        if waypoints:
            rtl_item = self.create_rtl_item(len(waypoints))
            mission_items.append(rtl_item)
        
        # Create the complete plan structure
        plan = {
            "fileType": "Plan",
            "geoFence": {
                "circles": [],
                "polygons": [],
                "version": 2
            },
            "groundStation": "QGroundControl",
            "mission": {
                "cruiseSpeed": 15,
                "firmwareType": 12,  # ArduPilot
                "globalPlanAltitudeMode": 1,
                "hoverSpeed": 5,
                "items": mission_items,
                "plannedHomePosition": home_position,
                "vehicleType": 2,  # Multi-rotor
                "version": 2
            },
            "rallyPoints": {
                "points": [],
                "version": 2
            },
            "version": 1
        }
        
        return plan


def main():
    raw = sys.stdin.read() or "{}"
    params = json.loads(raw)
    lat0 = float(params.get("lat0", 0))
    lon0 = float(params.get("lon0", 0))
    ground_msl = float(params.get("ground_msl", 0))
    local_xy_mode = params.get("local_xy_mode", "east")
    heading_true_deg = float(params.get("heading_true_deg", 0))
    test_type = (params.get("testType") or "").strip()

    # Define waypoints per test
    if test_type == "Wind Test":
        local_wps = [
            (0, 0, 1),
            (-3, 0, 1),
            (-3, -2, 1),
            (0, -2, 1),
            (0, 0, 1),
            (0, 0, 1),
            (0, 2, 1),
            (-3, 2, 1),
            (-3, -2, 1),
            (0, 0, 1),
        ]
    else:
        local_wps = []

    if not local_wps:
        # Minimal KML with only ground point if no waypoints
        kml_text = build_items_only_kml(lat0, lon0, ground_msl)
        plan_data = None
    else:
        wps_geodetic = waypoints_local_to_geodetic_agl(
            local_wps, lat0, lon0, ground_msl, local_xy_mode=local_xy_mode, heading_true_deg=heading_true_deg
        )
        take_lat, take_lon, take_amsl, take_rel = wps_geodetic[0]
        rest_pts = wps_geodetic[1:]
        kml_text = build_qgc_plan_kml(
            lat0_deg=lat0,
            lon0_deg=lon0,
            ground_msl_m=ground_msl,
            takeoff_lat=take_lat,
            takeoff_lon=take_lon,
            takeoff_amsl_m=take_amsl,
            takeoff_rel_m=take_rel,
            waypoint_geodetic_list=rest_pts,
            repeat_takeoff_in_path=True,
        )
        
        # Convert KML to .plan format
        try:
            converter = KMLToPlanConverter()
            plan_data = converter.convert_kml_to_plan(kml_text)
        except Exception as e:
            print(f"Error converting KML to plan: {e}", file=sys.stderr)
            plan_data = None

    kml_filename = f"qgc_plan_{(test_type or 'generic').lower().replace(' ', '_')}.kml"
    plan_filename = f"qgc_plan_{(test_type or 'generic').lower().replace(' ', '_')}.plan"
    
    result = {
        "kml": {
            "filename": kml_filename,
            "content": kml_text
        }
    }
    
    if plan_data:
        result["plan"] = {
            "filename": plan_filename,
            "content": json.dumps(plan_data, indent=2)
        }
    
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()