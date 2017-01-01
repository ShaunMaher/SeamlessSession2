# FreeRDP and Xpra for RemoteApps on Linux
## Issue
As per this, somewhat old, but report:
https://github.com/FreeRDP/FreeRDP/issues/2158 the FreeRDP client does not
support sharing the clipboard between client and remote session when using
RemoteApps.  For me at least, this is a RemoteApp deal breaker.

## Proposed work around
While reading the documentation for Xpra for a completely seperate project, I
noticed this: https://xpra.org/trac/wiki/Usage#Xpraasaclipboardsharingtool.
Basically you can use Xpra to synchronise the clipboard between two systems.

## Proof of concept one
In order to work out if this was going to be viable, without spending too much
time chasing a dead end, I did the following:

* Connect to a Windows 2012R2 Remote Desktop server using Remmina with the
  clipboard disabled (Advanced tab, "Disable clipboard sync")
* Attempted to copy and paste some text from my Linux desktop to notepad in the
  remote session to ensure that there was definately no clipboard sync.
* Installed the latest WinSwitch version on the Windows server.  Ignore all of
  the WinSwitch stuff itself, we just wanted the Xpra binaries and dependencies.
* Attempt one: start Xpra to shadow the RDP session and listen on a TCP port
  that the Linux desktop will connect to.  Failed.  All combinations of Xpra
  switches I tried either returned an error or returned nothing at all.
* Attempt two: start Xpra on the Linux desktop and connect to it from the Remote
  Desktop session.  Success.
* Copy text from Linux desktop into notepad on the remote session.  Success.

## Proof of concept two
Now we want to confirm that the above works with RemoteApps

* On the Windows server I have published Powershell as a RemoteApp.
* On the linux desktop I started Xpra shadowing my current session:
  ```
    xpra shadow :0 --bind-tcp=0.0.0.0:10000
  ```
* Run the Powershell RemoteApp:
  ```xfreerdp /u:USERNAME /d:DOMAIN /v:x.x.x.x /app:"||powershell"```
* Test copy and paste from Linux desktop to Powershell: Fail, as expected.
* In the powershell window:
  ```
    cd \
    cd "Program Files (x86)\Xpra"
    .\xpra.exe attach --no-printing --no-windows --no-speaker --no-cursors tcp:x.x.x.x:10000
  ```
* Copy and paste text fron Linux desktop into Powershell window: Success

## Limitations
* Only plain text is copied, no formatting, no images.  Copying between
  RemoteApps that are part of the same session supports formatted text and
  images.
* There is no security/encryption on the above implementation but Xpra supports
  SSL and authentication so security and privacy should be possible.
* This requires that the Windows server can connect to the Linux desktop which
  will be troublesome if there are firewalls or NAT between the two servers.
* FreeRDP's RemoteApp (rail) is still a bit clunky and Window managers/Window
  decorators on the Linux desktop interfere with some things:
  * Moving and resizing windows causes some interesting visual effects.  These
    settle down after a few moments though
  * On previous occasions I have had issues with popup menus being out of
    position or disappearing as soon as they appear or seeming to appear twice,
    one behind the actual parent window.  I can't replicate any of these things
    currently though so maybe the FreeRDP guys have made some imporvements.
  * Sometimes windows can become unresponsive to mouse imput.
