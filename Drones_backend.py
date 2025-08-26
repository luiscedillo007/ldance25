from tkinter import *
from tkinter import filedialog
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import math
import time
from natnet_client import DataDescriptions, DataFrame, NatNetClient

def receive_new_frame(data_frame: DataFrame):
    global num_frames
    num_frames += 1

def receive_new_desc(desc: DataDescriptions):
    print("Received data descriptions.")

def find_checkpoint(Axis, limit, start = 0):
#Compare field data against ideal flying scenario
    Axis = Axis[start:]
    for index, value in enumerate(Axis):
        value = str(value)
        if value.startswith(limit):
            checkpoint = int(index) + start
            print(checkpoint)
            return checkpoint

def calculate_tolerance(ideal, data, tolerance, point):
    accuracy = np.zeros(shape=(3,3), dtype = float)
    ideal = ideal[:,1:]
    data = data[:,1:]
    result_1 = np.isclose(ideal, data, rtol=1e-05, atol=tolerance*1, equal_nan=False)
    result_2 = np.isclose(ideal, data, rtol=1e-05, atol=tolerance*2, equal_nan=False)
    result_3 = np.isclose(ideal, data, rtol=1e-05, atol=tolerance*3, equal_nan=False)
    acc1 = np.sum(result_1 / len(result_1), axis = 0) * 100
    acc2 = np.sum(result_2 / len(result_2), axis = 0) * 100
    acc3 = np.sum(result_3 / len(result_3), axis = 0) * 100
    accuracy = np.array((acc1,acc2,acc3), dtype = float)
    #print("Checkpoint " + str(point) + " tolerance 1 for x = " + f'{acc1[0]:.2f}')
    #print("Checkpoint " + str(point) + " tolerance 2 for x = " + f'{acc2[0]:.2f}')
    #print("Checkpoint " + str(point) + " tolerance 3 for x = " + f'{acc3[0]:.2f}' + '\n')
    #print("Checkpoint " + str(point) + " tolerance 1 for y = " + f'{acc1[1]:.2f}')
    #print("Checkpoint " + str(point) + " tolerance 2 for y = " + f'{acc2[1]:.2f}')
    #print("Checkpoint " + str(point) + " tolerance 3 for y = " + f'{acc3[1]:.2f}' + '\n')
    #print("Checkpoint " + str(point) + " tolerance 1 for z = " + f'{acc1[2]:.2f}')
    #print("Checkpoint " + str(point) + " tolerance 2 for z = " + f'{acc2[2]:.2f}')
    #print("Checkpoint " + str(point) + " tolerance 3 for z = " + f'{acc3[2]:.2f}' + '\n')
    return accuracy

def take_off(dataframe, point: int, start = 0, tolerance = 0.12,  limit = '1.'):
    checkpoint_takeoff = find_checkpoint(dataframe['Z'], limit, start)
    data = np.array(dataframe, dtype = float)
    data = data[start:checkpoint_takeoff,:]
    t = data[:,0]
    x = np.full(fill_value = data[0,1], shape = len(data), dtype = float)
    y = np.full(fill_value = data[0,2], shape = len(data), dtype = float)
    z = np.arange(start = data[0,3], stop = data[-1,3], step = ((data[-1,3] - data[0,3]) / len(data)), dtype=float)
    ideal = np.column_stack((t,x,y,z))
    accuracy_takeoff = calculate_tolerance(ideal, data, tolerance, point)
    real = np.concatenate((real, data))
    path = np.concatenate((path, ideal))
    return accuracy_takeoff, checkpoint_takeoff, path, real
    	
def land(dataframe, path, real, point: int, start: int, tolerance = 0.12, axis = 'X'):
    data = np.array(dataframe, dtype = float)
    data2 = data[(start+1):-1, :]
    goal_x = data[0,1]
    goal_y = data[0,2]
    if axis == 'X':
        goal_x = data2[0,1]
        goal_y = data[0,2]
    elif axis == 'Y':
        goal_x = data[0,1]
        goal_y = data2[0,2]
    t = data2[:,0]
    x = np.full(fill_value = goal_x, shape = len(data2), dtype = float)
    y = np.full(fill_value = goal_y, shape = len(data2), dtype = float)
    z = np.arange(start = data2[0,3], stop = data2[-1,3], step = ((data2[-1,3] - data2[0,3]) / len(data2)), dtype=float)
    ideal = np.column_stack((t,x,y,z))
    accuracy_land = calculate_tolerance(ideal, data2, tolerance, point)
    #real.append(data)
    #path.append(ideal)
    real = np.concatenate((real, data))
    path = np.concatenate((path, ideal))
    return accuracy_land, path, real
    	
def line_fly(dataframe, path, real, point: int, start: int, tolerance = 0.12, axis = 'X', limit = '1.'):
    checkpoint_line = find_checkpoint(dataframe[axis], limit, start = start)
    data = np.array(dataframe, dtype = float)
    data = data[(start+1):checkpoint_line, :]
    if axis == 'X':
        #x = np.arange(start = data[0,1], stop = data[-1,1], step = ((data[-1,1] - data[0,1]) / len(data)), dtype=float)
        y = np.full(fill_value = data[0,2], shape = len(data), dtype = float)
        z = np.full(fill_value = data[0,3], shape = len(data), dtype = float)
        x = np.linspace(start = data[0,1], stop = data[-1,1], num = len(y))
    elif axis == 'Y':
        x = np.full(fill_value = data[0,1], shape = len(data), dtype = float)
        y = np.linspace(start = data[0,2], stop = data[-1,2], num = len(x))
        z = np.full(fill_value = data[0,3], shape = len(data), dtype = float)
    else:
        x = np.full(fill_value = data[0,1], shape = len(data), dtype = float)
        y = np.full(fill_value = data[0,2], shape = len(data), dtype = float)
        z = np.linspace(start = data[0,3], stop = data[-1,3], num = len(x))
    t = data[:,0]
    ideal = np.column_stack((t,x,y,z))
    accuracy_line = calculate_tolerance(ideal, data, tolerance, point)
    real = np.concatenate((real, data))
    path = np.concatenate((path, ideal))
    #real.append(data)
    #path.append(ideal)
    return accuracy_line, checkpoint_line, path, real
    
def hover(dataframe, path, real, point: int, start: int, tolerance = 0.12, time = 5):
    checkpoint_hover = start + time*120
    print(checkpoint_hover)
    data = np.array(dataframe, dtype = float)
    data = data[(start+1):checkpoint_hover, :]
    t = data[:,0]
    x = np.full(fill_value = np.mean(data[:,1]), shape = len(data), dtype = float)
    y = np.full(fill_value = np.mean(data[:,2]), shape = len(data), dtype = float)
    z = np.full(fill_value = np.mean(data[:,3]), shape = len(data), dtype = float)
    ideal = np.column_stack((t,x,y,z))
    accuracy_hover = calculate_tolerance(ideal, data, tolerance, point)
    real = np.concatenate((real, data))
    path = np.concatenate((path, ideal))
    #real.append(data)
    #path.append(ideal)
    return accuracy_hover, checkpoint_hover, path, real
    
num_frames = 0
global streaming_client
if __name__ == "__main__":
    streaming_client = NatNetClient(server_ip_address="192.168.137.1", local_ip_address="192.168.137.50", use_multicast=True)
    streaming_client.on_data_description_received_event.handlers.append(receive_new_desc)
    streaming_client.on_data_frame_received_event.handlers.append(receive_new_frame)

# Here, we are creating our class, Window, and inheriting from the Frame
# class. Frame is a class from the tkinter module. (see Lib/tkinter/__init__)
class Window(Frame):

    # Define settings upon initialization. Here you can specify
    def __init__(self, master=None):

        # parameters that you want to send through the Frame class. 
        Frame.__init__(self, master)   

        #reference to the master widget, which is the tk window                 
        self.master = master

        #with that, we want to then run init_window, which doesn't yet exist
        self.init_window()

    #Creation of init_window
    def init_window(self):

        # changing the title of our master widget      
        self.master.title("Quadcopter Framework")

        # allowing the widget to take the full space of the root window
        self.pack(fill=BOTH, expand=1)

        # creating a menu instance
        menu = Menu(self.master)
        self.master.config(menu=menu)

        # create the file object
        file = Menu(menu)

        # adds a command to the menu option, calling it exit, and the
        # command it runs on event is client_exit
        file.add_command(label="Exit", command=self.client_exit)

        #added "file" to our menu
        menu.add_cascade(label="File", menu=file)

        #Creating the buttons
        global button1
        global button2
        button1 = Button(self, text="Start Recording", command=self.start_recording)
        button1.place(x=0, y=0)
        button2 = Button(self, text="Stop Recording" , state = 'disabled', command=self.stop_recording)
        button2.place(x=0, y=50)
        evaluate_fly = Button(self, text="Evaluate Fly", command=self.eva_fly)
        evaluate_fly.place(x=120, y=0)
    	
    def clean_data(self, title, fileName, track, drone_radius):     #Function to clean the .csv Excell data
        data = []
        with open(fileName, 'r') as f_excell:                               	#Select csv file
            for line in f_excell:                                           	#Iterate the document
                line = line.split(sep=",")					#Separate the line in rows and columns
                data.append(line)                                          	#Append the data to array
            data = np.array(data[7:])                                       	#Eliminate first 7 rows
            #Drop all data besides positional information and convert array into a pandas dataframe
            quaternions = False
            if quaternions == True:
                df = pd.DataFrame(data[:,[1,6,7,8]], columns=['Time','X','Y','Z'])
            else:
                df = pd.DataFrame(data[:,[1,5,6,7]], columns=['Time','X','Y','Z'])
            df = df.replace(r'^\s*$', np.nan, regex=True).astype(float)    	#Replace blanks with Nan
            df = df.interpolate()                       			#Fill the Nan's with the closest known values
            #return df
        #Tolerance is replaced by user input which should be equal to the longest side of the drone
        path = np.zeros((0, 4))
        real = np.zeros((0, 4))
        if track == 1: #Hover over a point for n seconds
            acc1, checkpoint1, notused, notused = take_off(df, point=1, start=0, tolerance=drone_radius, limit= '1.')
            acc2, checkpoint2, path, real = hover(df, path, track, point=2, start=checkpoint1, tolerance=drone_radius, time = 5)
            acc3, notused, notused = land(df, path, track, point=3, start=checkpoint2, tolerance=drone_radius)
        elif track == 2: #Fly towards in a straight line
            acc1, checkpoint1, notused, notused = take_off(df, point=1, start=0, tolerance=drone_radius, limit= '1.')
            acc2, checkpoint2, path, real = line_fly(df, path, track, point=2, start=checkpoint1, tolerance=drone_radius, axis= 'X', limit= '3.')
            acc3, notused, notused = land(df, path, track, point=3, start=checkpoint2, tolerance=drone_radius)
        elif track == 3: #Crosswind in a straight line
            acc1, checkpoint1, notused, notused = take_off(df, point=1, start=0, tolerance=drone_radius, limit= '1.')
            acc2, checkpoint2, path, real = line_fly(df, path, track, point=2, start=checkpoint1, tolerance=drone_radius, axis= 'Y', limit= '2.')
            acc3, notused, notused = land(df, path, track, point=3, start=checkpoint2, tolerance=drone_radius)
        elif track == 4: #Calibration test
            acc1, checkpoint1, notused, notused = line_fly(df, path, real, point=1, start=0, tolerance=drone_radius, axis='X', limit= '0.0')
            acc2, checkpoint2, path, real = line_fly(df, path, real, point=2, start=checkpoint1, tolerance=drone_radius, axis='Y', limit= '1.75')
            acc3, checkpoint3, path, real = line_fly(df, path, real, point=3, start=checkpoint2, tolerance=drone_radius, axis='X', limit= '3.0')
            acc4, checkpoint4, path, real = line_fly(df, path, real, point=4, start=checkpoint3, tolerance=drone_radius, axis='X', limit= '-1.75')
            acc5, checkpoint5, path, real = line_fly(df, path, real, point=5, start=checkpoint4, tolerance=drone_radius, axis='X', limit= '0.0')
            acc6, checkpoint6, path, real = line_fly(df, path, real, point=6, start=checkpoint5, tolerance=drone_radius, axis='Y', limit= '0.0')
        elif track == 5: #Full wind test
            acc1, checkpoint1, notused, notused = line_fly(df, path, real, point=1, start=0, tolerance=drone_radius, axis='X', limit= '0.0')
            acc2, checkpoint2, path, real = line_fly(df, path, real, point=2, start=checkpoint1, tolerance=drone_radius, axis='X', limit= '3.0')
            acc3, checkpoint3, path, real = line_fly(df, path, real, point=3, start=checkpoint2, tolerance=drone_radius, axis='Y', limit= '1.75')
            acc4, checkpoint4, path, real = line_fly(df, path, real, point=4, start=checkpoint3, tolerance=drone_radius, axis='X', limit= '0.5')
            acc5, checkpoint5, path, real = line_fly(df, path, real, point=5, start=checkpoint4, tolerance=drone_radius, axis='Y', limit= '0.5')
            acc6, checkpoint6, path, real = hover(df, path, real, point=6, start=checkpoint5, tolerance=drone_radius, time = 5)
            acc7, checkpoint7, path, real = line_fly(df, path, real, point=7, start=checkpoint6, tolerance=drone_radius, axis='Y', limit= '-1.75')
            acc8, checkpoint8, path, real = line_fly(df, path, real, point=8, start=checkpoint7, tolerance=drone_radius, axis='X', limit= '3.0')
            acc9, checkpoint9, path, real = line_fly(df, path, real, point=9, start=checkpoint8, tolerance=drone_radius, axis='Y', limit= '1.75')
            acc10, notused, path, real = line_fly(df, path, real, point=10, start=checkpoint9, tolerance=drone_radius, axis='X', limit= '0.')
        elif track == 6: #Identify person test
            target_lat = 41.699780
            target_lon = -86.239000
            t = df['Time']
            x = df['X']
            y = df['Y']
            z = df['Z']
            #Iterate through the df to try to find the closest value to the aproximated latitude and longitude
            latitude = x[-1]
            longitud = y[-1]
            if latitude >= 41.699265 and latitude < 41.699295:          #Notredame latitude = 41.699280    11.1cm difference per 6th decimal
                if longitud >= -86.238899 and longitud < -86.238899:    #Notredame longitud = -86.238899   8.5cm difference per 6th decimal
                    lat_in_m = abs(latitude - target_lat) * 1000000 * 0.111
                    lon_in_m = abs(longitud - target_lon) * 1000000 * 0.085
                    dis_from_target = math.sqrt(lat_in_m ** 2 + lon_in_m ** 2)
                    print('The target was ' + str(dis_from_target) + 'm from the target')
        else:
            print("Error, the track selected is not available or correct")
        if track > 0 and track < 6:
            fig = plt.figure()
    	    # Set plot properties
            ax = plt.axes(projection = '3d')
            ax.set_xlabel('X')
            ax.set_ylabel('Y')
            ax.set_zlabel('Z')
            ax.set_title(title)

            #t, x, y, z = zip(*path)
            x = np.array(path[:, 1])
            y = np.array(path[:, 2])
            z = np.array(path[:, 3])
            ax.scatter(x, y, z, color = 'blue')
            x = np.array(real[:, 1])
            y = np.array(real[:, 2])
            z = np.array(real[:, 3])
            ax.scatter(x, y, z, color = 'red')
            plt.show()
            #takeoff_score = np.sum(acc1, axis = 1) / 3.0
            #test_score = np.sum(acc2, axis = 1) / 3.0
            #land_score = np.sum(acc3, axis = 1) / 3.0
            #print(takeoff_score)
            #print(test_score)
            #print(land_score)
            #score = 0.1 * takeoff_score + 0.6 * test_score + 0.3 * land_score
            #print(score)
            print(str(acc2) + '\n')
            print(str(acc3) + '\n')
            print(str(acc4) + '\n')
            print(str(acc5) + '\n')
            print(str(acc6) + '\n')
            print(str(acc7) + '\n')
            print(str(acc8) + '\n')
            print(str(acc9) + '\n')
            print(str(acc10) + '\n')
        #   print("The score achieved in track " + str(track) + " is: " + str(score) + '\n')
        
    def eva_fly(self):
    	#track = input("Enter the track used for evaluation and select its corresponding .csv file")
        root.fileName = filedialog.askopenfilename(filetypes = (("Excell files", "*.csv"), ("All files", "*.*")))
        title = "Full Wind Test"
        self.value = self.clean_data(title, fileName=root.fileName, track=5, drone_radius=0.32)

    def client_exit(self):
        exit()
    
    def start_recording(self):
        with streaming_client:
            streaming_client.send_command("StartRecording")
        button2['state'] = ACTIVE
        button1['state'] = DISABLED
    
    def stop_recording(self):
        with streaming_client:
            streaming_client.send_command("StopRecording")
        button1['state'] = ACTIVE
        button2['state'] = DISABLED
        
    def ask_user_for_info(self):
        battery = input("Enter current quadcopter voltage (Ex. 3.97 V) ")
        print(battery)
        if float(battery) > 4.0:
            trc = 5
        elif float(battery) > 3.8:
            trc = 4
        else:
            print("Remaining battery available is insufficient, please recharge it and try again")
            exit()
        print("There are " + str(trc) + " tracks available for evaluation")
	#Show images of available flights
        return battery

# root window created. Here, that would be the only window, but
# you can later have windows within windows.
root = Tk()

root.geometry("400x300")

#creation of an instance
app = Window(root)

#mainloop 
root.mainloop() 
