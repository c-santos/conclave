![Conclave Logo](/public/assets/img/conclave-mask-small.ico)

# Conclave: Collaborate in private

forked from conclave-team/conclave

## Summary

Conclave is an open-source, real-time, collaborative text editor for the browser built from scratch in JavaScript.

Intrigued by collaboration tools like Google Docs, we set out to build one from scratch. Conclave uses **Conflict-Free Replicated Data Types** (CRDT) to make sure all users stay in-sync and **WebRTC** to allow users to send messages directly to one another. The result is a private and decentralized way to collaborate on documents.

For more details on how we designed and built Conclave, read our [case study](https://conclave-team.github.io/conclave-site/).
# Prerequisites

Hosting peer requires
- Node v16.16.0

# How to Run Locally

You will need node and npm. First download the dependencies.

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

1. Hosting peer runs the application using the steps mentioned in above.
2. Hosting peer opens an instance of Conclave by entering the following in the address bar.
'''
[ip_of_host]:3000 
'''
Example: If the IP address of the host is 192.168.1.2, to access Conclave, the following will be entered in the address bar:
'''
192.168.1.2:3000
'''
3. Other peers can collaborate by entering the following in the address bar of their own browser. 
'''
[ip_of_host]:3000/peers
'''
Example: Using the same example from above, other peers must enter the following:
'''
192.168.1.2:3000/peers
'''
From here, you can choose the peer which you want to collaborate with.
4. As long as the hosting peer is running the Node app in the terminal, new peers will be able to connect. Otherwise, no new peers will be able to join but the existing peers in the network will still be able to collaborate.