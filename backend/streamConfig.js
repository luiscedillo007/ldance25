// streamConfig.js
module.exports = {
  // Web server port 
  serverPort: 3000,

  // Motive machine IP (NatNet server)
  serverIp: "169.254.228.35",  // <-- change to Motive PC IP
  useMulticast: true,

  // change to "py" or "python3" on some Windows setups
  pythonCmd: "python",

  // Path of the python script
  pythonScriptRelPath: "python_scripts/optitrack_stdout.py",
};
