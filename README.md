# ioBroker.fb-tr-064
monitor devices on the Fritz!Box for ioBroker
=======
<h1>
    <img src="admin/fb-tr-064.png" width="64"/>
    ioBroker.fb-tr-064
</h1>

## fb-tr-064 adapter for ioBroker

The adapter reads the network device list from the Fritz! Box and allows
to change the device name, the assignment to an owner,
whether the device should be monitored or a warning should be logged when going offline. 
Reading out the device list should provide an overview of active / inactive, 
LAN / WLAN devices and registered guest devices.

## Used device
For this adapter the AVM Fritzbox is used. Here you can find informations about
the Fritzbox https://avm.de/produkte/fritzbox/.

### Fritzbox conditions

The used TR-064 interface to the fritzbox is described here: https://avm.de/service/schnittstellen/.
Following TR-064 functions are used:
* GetSpecificHostEntry 
* X_AVM-DE_GetSpecificHostEntryByIP (supported from 2016-05-18) -> is used to read the status of a member via the IP address
* GetHostNumberOfEntries
* X_AVM-DE_GetHostListPath (support from 2017-01-09) -> is used for member configuration
* GetSecurityPort

By default, the TR-064 interface is not activated. However, this can easily be changed via the 
FritzBox web interface. To do this log in into your FritzBox and ensure that the expert view is activated. 
Then you will find below "Home Network »Home Network Overview» Network Settings" the point 
"Allow access for applications". There you have to activate the checkbox and then restart the FritzBox once.
<img src="doc/access_settings_network.JPG"/>

## Configuration dialog Main

### Fritzbox IP-address, user and password
The configuration of ip-address, user and password is necessary to get the device data from the fritzbox. 
The password is encrypted and wasn't saved in clear text.

### Interval
The interval can be configured from 1 to 3600 seconds. Normally a value of 67 to 187 seconds is an good interval 
to read the fritzbox data.

### Select warning on change IP address
You can choose whether a message is written to the log or to the telegram when the IP address is changed.

## Features

### Fritzbox info
The collected information is written as data points under fb-tr-064.n.info

### Fritzbox support checks
The function checks the availability and version of used fritzbox features. 
The collected information is written as data points under fb-tr-064.n.info.supportedFunctions

## Configuration dialog device settings
The list of devices is only displayed if the adapter was able to start successfully after the main configuration.
The list show following columns

### device name
from the Fritzbox, can be changed.
If activated (see watch), the other data points of the device are created under this name.

### MAC and IP address, interface
only for your information

### owner name
Is written as a data point, can be evaluated by other scripts. Used by me for presence detection.
"guest" is a reserved name for devices known to guests

### warn
If activated, data points are created for this device and the status (active / inactive) is updated in the query interval.

### watch
If activated and the device goes inactive, a warning is sent to the configured receiver (Off, Log, Telegram). This happens regardless of whether the device is being monitored or not.


## Device Objects
The following data points are maintained for each device

fb-tr-064.n.devices.<device name>.<state>

### Device Object: IP
the current ip address

### Device Object: IPlast
ip address before last change, initially identical to IP

### Device Object: MAC
the current mac address

### Device Object: MAClast
mac address before last change, initially identical to MAC
change detection is currently not supported

### Device Object: active
shows whether the device is active according to Fritzbox or not

### Device Object: deviceName
pre-filled with hostname from the Fritzbox, can be changed.
The data point for the device is created with this name.

### Device Object: guest
if the name of the owner of the device is "guest", the value is true

### Device Object: hostname
read hostname from the Fritzbox

### Device Object: interfacetype
read interfacetype from the Fritzbox

### Device Object: lastActive
time stamp when the device was last recognized as active from the Fritzbox

### Device Object: lastInactive
time stamp when the device was last recognized as inactive from the Fritzbox

### Device Object: owner
The name of the owner of the device from the configuration page

### Device Object: port
read port from the Fritzbox

### Device Object: speed
read speed from the Fritzbox

### Device Object: warn
the value of the setting on the configuration page for warn

### Device Object: watch
the value of the setting on the configuration page for watch

## Generell Objects
The following data points are cummulated informations

fb-tr-064.n.devices.<state>

### countDevicesActive
Number of active devices

### countDevicesActiveGuests
Number of active WLAN devices from guests

### countDevicesActiveLAN
Number of active LAN devices

### countDevicesActiveWLAN
Number of active WLAN devices

### countDevicesTotal
Number of devices

### deviceListActiveGuests_JSON
JSON table, all active guests devices

### deviceListActiveLAN_JSON
JSON table, all active LAN devices

### deviceListActiveWLAN_JSON
JSON table, all active WLAN devices

### deviceListActive_JSON
JSON table, all active devices

### deviceListAll_JSON
JSON table, all devices

### deviceListInactive_JSON
JSON table, all inactive devices

### deviceList_NewAddedDevices_JSON
JSON table, all new added device from Fritzbox

### deviceList_RemovedDevices_JSON
JSON table, all removed devices from Fritzbox network list

### idDeviceList_ip_changed
ip address has changed

### deviceList_ownerChanged
owner name has changed

### deviceList_warn_JSON
JSON table, all watched devices active state

### deviceList_warn_active_JSON
JSON table, all watched active devices

### deviceList_warn changed
warn state has changed

### deviceList_warn_inactive_JSON
JSON table, all watched inactive devices

### deviceList_watch changed
watch state has changed

## Fritzbox info Objects
The following data points are cummulated informations

fb-tr-064.n.info.<state>

### connection
the adapter is connected to the Fritzbox or not

### fb_IP
the ip address of th Fritzbox

### fb_MAC
the mac address of the Fritzbox

### name
the name of the Fritzbox

### supportedFunctions_version
OS version for the supported functions of the Fritzbox

### version
OS version of the Fritzbox


## Changelog 

### 0.3.4 small fixes

### 0.3.3 first public release on github

### 0.1.0
* (greyhound) initial release, partial fork from https://www.npmjs.com/package/iobroker.fb-checkpresence

## License
MIT License

Copyright (c) 2019-2020 truegreyhound <truegreyhound@gmx.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
>>>>>>> v0.3.3 Anpassung readme
