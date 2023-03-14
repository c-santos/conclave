![Conclave Logo](/public/assets/img/conclave-mask-small.ico)

# Conclave: Collaborate in private

Conclave is an open-source, real-time, collaborative text editor for the browser built from scratch in JavaScript.

Inspired by applications like Google Docs, Conclave takes advantage of realtime peer-to-peer communication enabled by WebRTC to allow users to collaboratively edit documents at the same time, without the need for a central server. Our group has modified the original application to enable collaboration in purely offline LAN and Ad hoc networks. Our implementation has been tested on Linux-based operating systems such as Ubuntu. 

See how the Conclave team developed the app in their [case study](https://conclave-team.github.io/conclave-site/).

# Objectives

Our group has made two significant modifications to achieve the following objectives:
1. Allow for continuous collaboration in the event of a disconnected peer.
2. Offer a suitable method of peer discovery in cases where internet connection is not available.

## Peer Handling
To achieve the first objective, our group has implemented the use of a P2P overlay network modeled after CAN (Content-Addressable Network). It is responsible for bootstrapping the network, appropriately balancing the P2P connections, and rearranging the network in the case of disconnected peers.

## Peer Discovery
For the second objective, the project uses an Express server to host the local PeerJS server required for WebRTC signalling. WebSockets are also used to facilitate the effortless discovery of peers in the network.

The overall flowchart of the original Conclave and the modified Conclave can be viewed in this [Miro board](https://miro.com/welcomeonboard/aFVuWHRpTlZNMTVLSGVNdXQ0M2h2a2VtbHA2OTVmbmxqZDRLOTh5OW1ldGhTYWY0dlVIaHZLT2xiRDZPOUptR3wzNDU4NzY0NTM2NTI0NjMwMzIxfDI=?share_link_id=145187002862)

# Prerequisites

Hosting peer requires
- Node v16.16.0

# How to Run Locally

You will need Node.js and npm. First download the dependencies.

```
npm install
```

Next, you will need to build and compile the assets and start the server. You can do that all in an npm command.

```
npm run local
```

We've added a Makefile and Dockerfile to make this easier. I highly recommend using them.

Simply run:

```
make run-local
```

And you will be good to go.

# How to use the application

1. Hosting peer runs the application using the steps mentioned above.
2. Hosting peer opens an instance of Conclave by entering ```[ip_of_host]:3000``` in the address bar.

    Example:

    If the IP address of the host is ```192.168.1.2```, to access Conclave, ```192.168.1.2:3000``` must be entered in the address bar
3. Other peers can collaborate by entering ```[ip_of_host]:3000/peers``` in the address bar of their own browser. 

    Example: 

    Using the same example from above, other peers must enter ```192.168.1.2:3000/peers``` in the address bar.


    From here, you can choose the peer which you want to collaborate with.
4. As long as the hosting peer is running the Node app in the terminal, new peers will be able to connect. Otherwise, no new peers will be able to join but the existing peers in the network will still be able to collaborate.
