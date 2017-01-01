# Seamless Session 2
## Problem
I made the switch to Ubuntu as my desktop OS a few years ago and have since then
been looking for a good way to run/access Windows applications in a seamless
way.

I know that for nearly every Windows only application there is a Linux
equivelant but there are some tasks where there is simply no good alternative.  
The main things that are hurting me are Microsoft Outlook (for all it's
functionallity, not just an email client) and Microsoft Skype for Business
(formerly Lync).

I need to be able to reliably use some Windows only applications because,
simply, I can't really tell my boss that I can't do a thing (or do a thing
efficiently) because I use Ubuntu.  He'll say "here's a Windows license" and he
is justified in doing so.

By seamless, I mean it's just like running native Linux applications:
* Your linux Documents, Downloads, etc. directories are their Windows
  equivelents
* Clicking a link in a Windows application opens your local default browser
* Notifications in Windows apps are captured and converted to the Linux DE's
  notification system.

Nearly all of these requirements are covered by the Wine project's great work
but it seems that if you use Wine you need to be content with using older
versions of software.  I'm writing this in early 2017 and at this time Microsoft
Office 2013 still does not run without some functionallity being missing and a
bunch of quirks.  Most of my co-workers on their Windows PCs are using Office
2016.

I've come to the conclusion that, at least for now, Wine is not the answer.

I thought about using something like VirtualBox to run a Windows VM locally
with the applications I need.  VirtualBox even has a seamless mode.  I didn't
end up trying this because I decided that, and this isn't entirely logical, if I
was running a local Windows VM, I may as well just run Windows on my PC.  After
all, I now need enough resources to run two OSs at once I could reduce that to
just one OS by just using Windows.

Next up I decided to try hosting the required applications on a Windows Remote
Desktop Services Server (Terminal Server) and accessing them from my Linux PC.
This way, Windows is wasting resources elsewhere.  The problem here is that the
experience is far from seamless.

FreeRDP does currently support RemoteApps (rail) published from a Windows RDS
server but there are some drawbacks.  The biggest issue being clipboard support.
You can't copy and paste between local applications and RemoteApp applications.

This is where I've been stuck.  I've been struggling along without Microsoft
Outlook, with Microsoft Office 2010 in Wine and without Skype for Business.

I did spend some time coming up with a solution that embeded a full Remote
Desktop into it's own workspace but I was not happy enough with the result that
I got bored and abandoned the project.

I recently found a partial solution to the missing clipboard functionallity
which got me excited enough to revisit this problem.

## Proposal
My proposal is an agent (maybe two) on the RDP server and a client application
on the Linux desktop.  They need to work together to:
* Configure the remote session when either the session is created or reconnected
  to.
  * Implement the clipboard solution
  * Map Windows profile directories to directories on the Linux client
* Capture and forward popup notifications on the server and forward them to the
  client
* Capture attempts to open a URL on the server and forward them to the client
  for opening in it's local default browser.

My previous attempts to implement such a solution used shell scripts on the
Linux client and Powershell on the Windows server.  Information was passed
between the two by creating and polling for files in a directory passed through
FreeRDP (\\\tsclient\\).  This resulted in delays because there was a limit to
how often I could request the file across the connection and wasted bandwidth.  
I also found the passing of directories from client to server with FreeRDP
intermittently unreliable.

This time I'm going to do things a little differently.

My favorite toy at the moment is Node so I'm going to implement both agent and
client with this.

I'm going to create a REST API with ExpressJS that the server agent(s) and
client can use to pass information.  I know that this means that the server and
client will then need to be able to communicate directly and firewalls/NAT
become issues but I can circle back and revisit this issue later.  For the
moment it will be assumed that the server and client will be on the same network
or connected with a VPN.

I'm going to be specifically targeting Windows 2012R2 and Windows 2016 at the
server end and Ubuntu Linux as the client for initial development as this covers
my specific use case.  Hopefully nothing at the client end will be so specific
as to preclude adding additional client OSs in the future.

### Clipboard solution
See RemoteAppRemoteAppClipboard.md

### Map Windows profile directories to directories on the Linux client
As I mentioned above, I have had issues previously passing files between client
and server with the FreeRDP client.  It's also going to be extremely difficult
to remap the Windows profile directories to their Linux client equivelents with
RDP.

Whatever the Windows profile directories are mapped to needs to be always (or as
close to as possible) available.  Applications and Windows itself will have
issues if these directories intermittently disappear.

What we need the server side agent to do is map the profile directories to the
client when the client is connected and re-map them to local directories when
the client is disconnected.  I haven't worked out how to do this remapping
on-the-fly so instead I'm going to have to point the directories as some
location that can itself be reconfigured on-the-fly.

I'm thinking, but haven't tested as a solution, is to point the profile
directories at a DFS namespace.  The DFS namespace can then be reconfigured with
Powershell commands that change where it redirects the client's requests to.
The namespace will be configured to have a local share as it's fallback
location.

On the client end I will start a smbd instance as the user and share the
required directories.  This again adds network requirements but we'll see what
we can do about this later.

This is the reason that we'll probably need two agents on the server.  The agent
running within the user's session will not have sufficient administrative
permissions to reconfigure DFS namespaces so it will request that another agent
running as a user with sufficient permissions make the changes.

### Capture and forward popup notifications on the server and forward them to the client
I don't think that Windows has a universal method for creating popup
notifications that we can tap into.  I have worked out how in the past to tap
into the new mail notification in Outlook though.  That might do for an initial
implementation.

Once a notification is captured, an API call to the client is made and the
client displays the notification.

### Clicking a link in a Windows application opens your local default browser
Register some script/executable as a browser.  The script makes an API call to
the agent on the client which launches the URL in a local browser.

## Conclusion
Ok.  That's the idea.  Time to start with some proof of concepts!
