class Broadcast {
  constructor() {
    this.controller = null;
    this.peer = null;
    this.outConns = [];
    this.inConns = [];
    this.outgoingBuffer = [];
    this.MAX_BUFFER_SIZE = 40;
    this.currentStream = null;
    // Additions
    this.region = ''; // string of zone 'XStart,XEnd,YStart,YEnd'
    this.refPoint = [];
    this.genValue = null;
    this.neighbors = [];
  }

  regionAdapter(region){
    // To stringify region
    let zone = region[0][0] + ',' + region[0][1] + ',' + region[1][0] + ',' + region[1][1];
    return zone; // from [[int],[int]] to [string]
  }

  checkNeighbor(){
    // Prints neighbors of calling peer
    this.neighbors.forEach((item) =>{
      console.log('\tDEBUG:\t\n---------NEIGHBORS: ' + Object.values(item));
    });
  }

  confirmNeighbor(peerId, siteId){
    // console.log('\tDEBUG:\tADDED TO OUTCONNS: ' + peerId);
    const conn = this.peer.connect(peerId);
    this.addToOutConns(conn);
    this.controller.addToNetwork(peerId, siteId);
  }

  appendNeighbor(peerId, siteId, newPeerZone){
    // Appends a neighbor defined by peerId to neighbors list of calling instance
    this.neighbors.push({
      peerId: peerId,
      siteId: siteId,
      region: newPeerZone,
    });
    this.checkNeighbor();
  }
  

  connectPeers(peerId, siteId, newPeerZone){
    /* 
      Passes connRequest of connecting peer to neighbors of original peer
      Called by OG peer
      peerId: of connecting peer
      newPeerZone: zone of connecting peer
    */
  
    // List of original neighbors not including connecting peer, since it was added to outConns during acceptConnRequest()
    const origNeighbors = this.outConns.filter(conn => conn.peer !== peerId);

    // Construction of addNeighbor message
    const forwardData = JSON.stringify({
      type: 'addNeighbor',
      peerId: peerId,
      siteId: siteId,
      region: newPeerZone   // zone of connecting peer
    });

    // Checks if neighbor of OG is neighbor of connecting, if yes, addNeighbor
    if(origNeighbors.length !== 0){ 
      this.neighbors.forEach((neighbor) => { // For each neighbor of original peer

        // Get connection of OG peer and its neighbor
        const connNeighbor =  origNeighbors.find(conn => conn.peer === neighbor.peerId);
        
        if(connNeighbor){ // If connection exists
          
          // console.log('\tDEBUG:\tCONNECTING PEER: ' + peerId);
          // console.log('\tDEBUG:\tNEIGHBOR PEER: ' + neighbor.peerId);
          
          // Checks if connecting peer and this neighbor of OG peer are neighbors
          if(this.isNeighbor(neighbor.region, newPeerZone)){

            // Send addNeighbor message to connecting peer
            // Initiates connRequest from connecting peer to neighbor of OG peer
            if (connNeighbor.open) {
              connNeighbor.send(forwardData);
            } 
            else {
              connNeighbor.on('open', () => {
                connNeighbor.send(forwardData);
              });
            } 
          }  
        }   
      })
    }
  }
  

  // Asks neighbors of calling peer to update neighbor
  // peerId: of connecting peer
  updateRequest(peerId){
    // Get list of neighbors excluding connecting peer
    const origNeighbors = this.outConns.filter(conn => conn.peer !== peerId);
    
    // Send askUpdateNeighbor message to above list
    // Contains details of own instance
    if(origNeighbors.length !== 0){
      const request = JSON.stringify({
        type: 'askUpdateNeighbor',
        peerId: this.peer.id,
        siteId: this.controller.siteId,
        region: this.region,
      });    
    
      origNeighbors.forEach((neighbor) => {
        if (neighbor.open) {
          // console.log('\tDEBUG:\tREQUEST SENT from ' + this.peerId);
          neighbor.send(request);
        } else {
          neighbor.on('open', () => {
            neighbor.send(request);
          });
        } 
      });
    }
  }


  replyRequest(peerId, siteId, region){
    /*
    Called by peer replying to updateRequest()
    params are owned by peer requesting update
    peerId: of requesting peer
    */
    
    // Gets connection with requesting peer from outConns of replying peer
    const replyConn = this.outConns.find(conn => conn.peer === peerId);

    // Constructs doUpdateNeighbor message to be sent to requesting peer
    // Details sent are owned by replying peer
    const reply = JSON.stringify({
      type: 'doUpdateNeighbor',
      peerId: this.peer.id,
      siteId: this.controller.siteId,
      region: this.region,
    });
    
    // Sends doUpdateNeighbor message / replies to requesting peer
    if (replyConn.open) {
        replyConn.send(reply);
    } else {
        replyConn.on('open', () => {
          replyConn.send(reply);
      });
    }

    this.updateNeighbor(peerId, siteId, region);  //
  }

  // Updates passed neighbor region. 
  // Removes neighbor if not neighbor anymore.
  // peerId: peer to be updated / removed
  updateNeighbor(peerId, siteId, region){
  
    let remove = null;
    
    // Removes that do not pass isNeighbor()
    this.neighbors.forEach((neighbor) => {
      if(peerId === neighbor.peerId){ //  If neighbor is the passed peer
        if(this.isNeighbor(this.region, region)){ // Check if we are still neighbors
          neighbor.region = region; // update region of neighbor with the passed region
          remove = false;
        }
        else{
          remove = true;  // this and peerId are no longer neighbors
        }
      }

      if(remove){
        // console.log('\tDEBUG: \t !----------!REMOVE TRUE!-----------!')
        this.neighbors = this.neighbors.filter(neighbor => peerId !== neighbor.peerId); // Remove from neighbor list

        let connection = this.outConns.find((conn) => conn.peer === peerId); // Find removed in outConns
        connection.close(); // Close connection of removed
        // this.inConns = this.inConns.filter(conn => conn.peer !== peerId);
        // this.outConns = this.outConns.filter(conn => conn.peer !== peerId);
      }
      
    });
    // console.log('\tDEBUG:\t!------UPDATE SUCCESS------!');
    this.checkNeighbor();
  }

  // Checking if two peers are neighbors
  isNeighbor(neighborZone, newPeerZone){
    // console.log('\tDEBUG:\tISNEIGHBOR() RUNNING');
    let neighbor = null;
    let temp1 = neighborZone.split(',').map(Number);
    let temp2 = newPeerZone.split(',').map(Number);
    console.log('\tDEBUG:\tCONNECTING ZONE: ' + newPeerZone);
    console.log('\tDEBUG:\tNEIGHBOR ZONE: ' + neighborZone);

    let xStart1 = temp1[0];
    let xEnd1 = temp1[1];
    let xStart2 = temp2[0];
    let xEnd2 = temp2[1];

    let yStart1 = temp1[2];
    let yEnd1 = temp1[3];
    let yStart2 = temp2[2];
    let yEnd2 = temp2[3];

    if ((xEnd1 >= xStart2) && (xEnd2 >= xStart1)){
      if ((xEnd1 - xStart2 == 0) || (xEnd2 - xStart1 == 0)){
          // xintersect = 1;
          if ((yEnd1 >= yStart2) && (yEnd2 >= yStart1)){
              if ((yEnd1 - yStart2 == 0) || (yEnd2 - yStart1 == 0)){
                  //yintersect = 1;
                  neighbor = false;
              }else{
                  //yintersect = 2;
                  neighbor = true;
              }
          }else{
              //yintersect = 0;
              neighbor = false;
          }
      }else{
          // xintersect = 2;
          if ((yEnd1 >= yStart2) && (yEnd2 >= yStart1)){
              neighbor = true;
          }else{
              if((yEnd1%10 == 0) && (yStart2%10 == 0) || (yEnd2%10 == 0) && (yStart1%10 == 0)){// wrapping y
                  //yintersect = 1
                  neighbor = true;
              }else{
                  //yintersect = 0;
                  neighbor = false;
              }
          }
      }
  }else{
      if((xEnd1%10 == 0) && (xStart2%10 == 0) || (xEnd2%10 == 0) && (xStart1%10 == 0)){ // wrapping x
          //xintersect = 1;
          if ((yEnd1 >= yStart2) && (yEnd2 >= yStart1)){
              if ((yEnd1 - yStart2 == 0) || (yEnd2 - yStart1 == 0)){
                  //yintersect = 1;
                  neighbor = false;
              }else{
                  //yintersect = 2;
                  neighbor = true;
              }
          }else{
              //yintersect = 0;
              neighbor = false;
          }
      }else{
          //xintersect = 0;
          neighbor = false;
      }
  }
    // console.log('\tDEBUG:\tISNEIGHBOR() = ' + neighbor);
    return neighbor;
  }


  acceptNeighbor(peerId, siteId, newPeerZone) {
    /*
      Neighbor of original peer accepts connecting peer as neighbor
      peerId: of connecting peer
      newPeerZone: of connecting peer
    */

    const connBack = this.peer.connect(peerId); // connect this neighbor to connecting peer
    if(connBack){
      this.appendNeighbor(peerId, siteId, newPeerZone); // add connecting peer as neighbor of this neighbor
    }
    this.addToOutConns(connBack); // add connection of this neighbor and connecting to outConns of neighbor
    this.controller.addToNetwork(peerId, siteId);
    
    // Construction of syncNeighbor message
    // Sent to connecting peer for it to add this neighbor to its list of neighbors
    const initialData = JSON.stringify({
      type: 'syncNeighbor',
      siteId: this.controller.siteId,
      peerId: this.peer.id,
      initialStruct: this.controller.crdt.struct,
      initialVersions: this.controller.vector.versions,
      network: this.controller.network,
      //additions
      peerZone: this.region,
    });
    
    // Send syncNeighbor to connecting peer
    if (connBack.open) {
      connBack.send(initialData);
      // console.log("\tDEBUG:\tSENT");
    } else {
      connBack.on('open', () => {
        connBack.send(initialData);
        // console.log("\tDEBUG:\tSENT");
      });
    }
  }
  

  // Connecting peer takes offered zone.
  // zoneOffer: zone to be taken up by connecting peer
  // Gen: genValue of OG peer
  zoneTake(zoneOffer, Gen) {
    
    this.region = zoneOffer;

    //this.refPoint = [Math.floor((Math.random()*(this.region[0][1]-this.region[0][0]))+this.region[0][0]), Math.floor((Math.random()*(this.region[1][1]-this.region[1][0]))+this.region[1][0])];

    this.genValue = 2*(Gen)+1; // updates genValue of connecting peer
    console.log('\tDEBUG:\tZONE of Connecting Peer: ' + this.region);
    console.log('\tDEBUG:\tGENVAL of Connecting Peer: ' + this.genValue);
  }

  // called by Original peer
  zoneShare() {
    // console.log('\tDEBUG:\tTHIS.REGION: ' + this.region + ' ' + typeof this.region);
    let zone = this.region.split(',').map(Number);
    let xStart = zone[0];
    let xEnd = zone[1];
    let yStart = zone[2];
    let yEnd = zone[3];
    let zoneOffer = []
    let Offer = [];
    let myZone = [];
    
    //connecting Peer
    if((yEnd-yStart)>(xEnd-xStart)){
      Offer = [[xStart,xEnd],[yStart,((yEnd+yStart)/2)]];
    }else{
      Offer = [[xStart,(xEnd+xStart)/2],[yStart,yEnd]];
    }

    zoneOffer[0] = this.regionAdapter(Offer); // ex: '1,2,3,4'

    //original Peer
    if((yEnd-yStart)>(xEnd-xStart)){
      myZone = [[xStart,xEnd],[(yStart+yEnd)/2,yEnd]];
    }
    else {
      myZone = [[(xStart+xEnd)/2,xEnd],[yStart,yEnd]];
    }
    this.region = this.regionAdapter(myZone);
    zoneOffer[1] = this.region; // ex: '1,2,3,4'
    
    // zoneOffer = [connecting, original]
    return zoneOffer;
  }
  
  send(operation) {
    const operationJSON = JSON.stringify(operation);
    if (operation.type === 'insert' || operation.type === 'delete') {
      this.addToOutgoingBuffer(operationJSON);
    }
    this.outConns.forEach(conn => conn.send(operationJSON));
  }

  addToOutgoingBuffer(operation) {
    if (this.outgoingBuffer.length === this.MAX_BUFFER_SIZE) {
      this.outgoingBuffer.shift();
    }

    this.outgoingBuffer.push(operation);
  }

  processOutgoingBuffer(peerId) {
    const connection = this.outConns.find(conn => conn.peer === peerId);
    this.outgoingBuffer.forEach(op => {
      connection.send(op);
    });
  }

  bindServerEvents(targetPeerId, peer) {
    this.peer = peer;
    this.onOpen(targetPeerId);
    this.heartbeat = this.startPeerHeartBeat(peer);
    this.periodicSend = this.periodicSend();
  }

  startPeerHeartBeat(peer) {
    let timeoutId = 0;
    const heartbeat = () => {
      timeoutId = setTimeout( heartbeat, 20000 ); // after 20s do heartbeat()
      if ( peer.socket._wsOpen() ) {
          peer.socket.send( {type:'HEARTBEAT'} );
          console.log('\tDEBUG: \t !---SOCKET STILL OPEN-----!')
      }
    };

    heartbeat(); // checks if socket open after 20s

    return {
      start : function () {
        if ( timeoutId === 0 ) { heartbeat(); }
      },
      stop : function () {
        clearTimeout( timeoutId );
        timeoutId = 0;
      }
    };
  }

  periodicSend(){
    let timeoutId = 0;

    const areYouAlive = () => {
      timeoutId = setTimeout(areYouAlive, 10000);

      this.neighbors.forEach((neighbor)=>{
        let connNeighbor = this.outConns.find(conn => conn.peer === neighbor.peerId);
        if(!connNeighbor){
          console.log("\tDEBUG: \t !--CONNECTION TO NEIGHBOR NOT FOUND---!");
        }
        else{
          console.log("\tDEBUG: \t !--CONNECTION TO NEIGHBOR---!" + connNeighbor.peer);
        }
      });
      console.log("\t!--------------------!");

    };

    areYouAlive();

    return {
      start : function () {
        if ( timeoutId === 0 ) { areYouAlive(); }
      },
      stop : function () {
        clearTimeout( timeoutId );
        timeoutId = 0;
      }
    };
  }

  onOpen(targetPeerId) {
    this.peer.on('open', id => {
      this.controller.updateShareLink(id);
      this.onPeerConnection();
      this.onError();
      this.onDisconnect();
      if (targetPeerId == 0) {
        this.controller.addToNetwork(id, this.controller.siteId);
      } else {
        this.requestConnection(targetPeerId, id, this.controller.siteId)
      }
    });
  }

  onError() {
    this.peer.on("error", err => {
      const pid = String(err).replace("Error: Could not connect to peer ", "");
      this.removeFromConnections(pid);
      console.log(err.type);
      if (!this.peer.disconnected) {
        this.controller.findNewTarget();
      }
      this.controller.enableEditor();
    });
  }

  onDisconnect() {
    this.peer.on('disconnected', () => {
      // this.neighbors.forEach((neighbor) => {
      //   const connection =  neighbors.find(conn => conn.peer === neighbor.peerId)
      //   connection.send(JSON.stringify({
      //     type: 'disconnect message',
      //     string: 'A PEER HAS DISCONNECTED'
      // }))
      // });

      this.controller.lostConnection();
    });
  }

  requestConnection(target, peerId, siteId) {
    const conn = this.peer.connect(target);
    this.addToOutConns(conn);
    conn.on('open', () => {
      conn.send(JSON.stringify({
        type: 'connRequest',
        peerId: peerId,
        siteId: siteId,
      }));
    });
  }

  // OG peer evaluates request sent by connecting peer.
  // peerId: of connecting peer
  evaluateRequest(peerId, siteId) {

    // Construction of biggest neighbor object
    // Initial biggest is the original peer itself
    let biggestNeighbor = {
      peerId: this.peer.id,
      siteId: this.controller.siteId,
      region: this.region,
    };

    // For each neighbor of OG peer, compare the neighbor with the current biggest
    this.neighbors.forEach((neighbor) =>{
      // If neighbor > current biggest, neighbor is now the biggest
      if(this.getSize(neighbor.region) > this.getSize(biggestNeighbor.region)){
        biggestNeighbor.peerId = neighbor.peerId;
        biggestNeighbor.siteId = neighbor.siteId;
        biggestNeighbor.region = neighbor.region;
      }
    });

    // Get connection of OG and biggestNeighbor
    const connection = this.outConns.find(conn => conn.peer === biggestNeighbor.peerId);

    // If determined biggest > OG, forward connection to that biggest
    if(this.getSize(biggestNeighbor.region) > this.getSize(this.region)){
      connection.send(JSON.stringify({
        type: 'connRequest',
        peerId: peerId,
        siteId: siteId,
      }));
    }
    // If OG was the biggest, acceptConnRequest
    else{
      this.acceptConnRequest(peerId, siteId);
    }
  }

  getSize(zone){
    let temp1 = zone.split(',').map(Number);
    let XStart = temp1[0];
    let XEnd = temp1[1];
    let YStart = temp1[2];
    let YEnd = temp1[3];
    let area = (YEnd-YStart)*(XEnd-XStart);
    
    return area;
  }

  addToOutConns(connection) {
    if (!!connection && !this.isAlreadyConnectedOut(connection)) {
      this.outConns.push(connection);
    }
  }

  addToInConns(connection) {
    if (!!connection && !this.isAlreadyConnectedIn(connection)) {
      this.inConns.push(connection);
    }
  }

  addToNetwork(peerId, siteId) {
    this.send({
      type: "add to network",
      newPeer: peerId,
      newSite: siteId
    });
  }

  removeFromNetwork(peerId) {
    this.send({
      type: "remove from network",
      oldPeer: peerId
    });
    this.controller.removeFromNetwork(peerId);
  }

  removeFromConnections(peer) {
    this.inConns = this.inConns.filter(conn => conn.peer !== peer);
    this.outConns = this.outConns.filter(conn => conn.peer !== peer);
    this.removeFromNetwork(peer);
  }

  isAlreadyConnectedOut(connection) {
    if (connection.peer) {
      return !!this.outConns.find(conn => conn.peer === connection.peer);
    } else {
      return !!this.outConns.find(conn => conn.peer.id === connection);
    }
  }

  isAlreadyConnectedIn(connection) {
    if (connection.peer) {
      return !!this.inConns.find(conn => conn.peer === connection.peer);
    } else {
      return !!this.inConns.find(conn => conn.peer.id === connection);
    }
  }

  onPeerConnection() {
    this.peer.on('connection', (connection) => {
      this.onConnection(connection);
      this.onData(connection);
      this.onConnClose(connection);
    });
  }

  // Original peer accepts connecting peer.
  // peerId: of connecting peer
  acceptConnRequest(peerId, siteId) {
    const connBack = this.peer.connect(peerId);   // connects OG peer to connecting peer
    this.addToOutConns(connBack);                 // adds connection to outConns of OG peer
    this.controller.addToNetwork(peerId, siteId); // adds connecting peer to the network
    let zoneOffer = this.zoneShare();             // OG peer splits zone and offers zone for connecting peer
    
    // Construction of syncResponse message sent to connecting peer
    const initialData = JSON.stringify({
      type: 'syncResponse',
      siteId: this.controller.siteId,
      peerId: this.peer.id,
      initialStruct: this.controller.crdt.struct,
      initialVersions: this.controller.vector.versions,
      network: this.controller.network,
      // Additions
      peerZone: zoneOffer[1],   // zone of original
      zoneOffer: zoneOffer[0],  // zone of connecting
      Gen: this.genValue,       // genValue of original
    });

    // Sends the syncResponse through the connection of the OG and connecting peer
    if (connBack.open) {
      connBack.send(initialData);
    } else {
      connBack.on('open', () => {
        connBack.send(initialData);
      });
    }

    this.genValue = 2*(this.genValue)+2;  // updates genValue of original peer, since new level in tree
    
    console.log('\tDEBUG:\ ZONE of Original Peer: ' + this.region);
    console.log('\tDEBUG:\ GENVAL of Original Peer: ' + this.genValue);

    this.appendNeighbor(peerId, siteId, zoneOffer[0]);  // adds connecting peer to neighbor list of OG peer
                                                        // zoneOffer[0] -> zone of connecting peer
    this.connectPeers(peerId, siteId, zoneOffer[0]);    // passes neighbors of OG peer to connecting peer
    this.updateRequest(peerId);                         // 
  }

  onConnection(connection) {
    this.controller.updateRootUrl(connection.peer);
    this.addToInConns(connection);
  }

  onData(connection) {
    connection.on('data', data => {
      const dataObj = JSON.parse(data);

      switch(dataObj.type) {
        case 'connRequest':
          this.evaluateRequest(dataObj.peerId, dataObj.siteId);
          break;
        case 'askUpdateNeighbor': //
          // console.log('\tDEBUG:\tREQUEST RECEIVED from:' + dataObj.peerId); // adds neighbor
          this.replyRequest(dataObj.peerId, dataObj.siteId, dataObj.region ); // adds 
          break;
        case 'doUpdateNeighbor': // adds neighbor
          this.updateNeighbor(dataObj.peerId, dataObj.siteId, dataObj.region); // adds 
          break;
        case 'addNeighbor': // adds connecting peer as a neighbor of OG's neighbors
          this.acceptNeighbor(dataObj.peerId, dataObj.siteId, dataObj.region);
          break;
        case 'syncNeighbor': // new syncResponse for neighbor adding
          this.confirmNeighbor(dataObj.peerId, dataObj.siteId); 
          this.processOutgoingBuffer(dataObj.peerId);
          this.appendNeighbor(dataObj.peerId, dataObj.siteId, dataObj.peerZone);
          break;
        case 'syncResponse': // received by connecting peer
          this.processOutgoingBuffer(dataObj.peerId);
          this.controller.handleSync(dataObj);
          this.zoneTake(dataObj.zoneOffer,dataObj.Gen); // Takes offered zone from OG peer
          this.appendNeighbor(dataObj.peerId, dataObj.siteId, dataObj.peerZone);  // adds OG peer to neighbor of connecting
          break;
        case 'syncCompleted':
          this.processOutgoingBuffer(dataObj.peerId);
          break;
        case 'add to network':
          this.controller.addToNetwork(dataObj.newPeer, dataObj.newSite);
          break;
        case 'remove from network':
          this.controller.removeFromNetwork(dataObj.oldPeer);
          break;
        default:
          this.controller.handleRemoteOperation(dataObj);
      }
    });
  }

  randomId() {
    const possConns = this.inConns.filter(conn => {
      return this.peer.id !== conn.peer;
    });
    const randomIdx = Math.floor(Math.random() * possConns.length);
    if (possConns[randomIdx]) {
      return possConns[randomIdx].peer;
    } else {
      return false;
    }
  }

  onConnClose(connection) {
    connection.on('close', () => {
      // this.removeFromConnections(connection.peer);
      // if (connection.peer == this.controller.urlId) {
      //   const id = this.randomId();
      //   if (id) { this.controller.updatePageURL(id); }
      // }
      // if (!this.hasReachedMax()) {
      //   // this.controller.findNewTarget();
      // }
      console.log("\tDEBUG: \t!----a connection has closed----!");
      // this.zoneTakeover(connection.peer);
    });
  }
  
  zoneTakeover(peerId){
    let sibling = this.neighbors.find((neighbor) => neighbor.peerId === peerId);
    
    if(predecessor(this.genValue) === predecessor(neighbor.genValue)){
      
    }

  }

  zoneMerge(){ // params: some way to reference disconnecting and merging z

    let temp1 = disconnectingZone.split(',').map(Number); // zone of disconnecting
    let temp2 = mergingZone.split(',').map(Number); // zone of sumasapaw
    
    mergingZone.region[0] = Math.min(temp1[0],temp2[0]);
    mergingZone.region[1] = Math.min(temp1[1],temp2[1]);
    mergingZone.region[2] = Math.min(temp1[2],temp2[2]);
    mergingZone.region[3] = Math.min(temp1[3],temp2[3]);

    // send takeOverSuccess to peer that sent ZoneTakeOver()
    connection.send(JSON.stringify({
      type: 'takeOverSuccess',
      string: '' // some way to confirm the merge  
      
    }));
    
  }
  
  zoneTransfer(){
    
  }

  hasReachedMax() {
    const halfTheNetwork = Math.ceil(this.controller.network.length / 2);
    const tooManyInConns = this.inConns.length > Math.max(halfTheNetwork, 5);
    const tooManyOutConns = this.outConns.length > Math.max(halfTheNetwork, 5);

    return tooManyInConns || tooManyOutConns;
  }

/*
  forwardConnRequest(peerId, siteId) {
    const connected = this.outConns.filter(conn => conn.peer !== peerId);
    const randomIdx = Math.floor(Math.random() * connected.length);
    connected[randomIdx].send(JSON.stringify({
      type: 'connRequest',
      peerId: peerId,
      siteId: siteId,
    }));
  }
  
  videoCall(id, ms) {
    if (!this.currentStream) {
      const callObj = this.peer.call(id, ms);
      this.onStream(callObj);
    }
  }

  onVideoCall() {
    this.peer.on('call', callObj => {
      this.controller.beingCalled(callObj);
    });
  }

  answerCall(callObj, ms) {
    if (!this.currentStream) {
      callObj.answer(ms);
      this.controller.answerCall(callObj.peer);
      this.onStream(callObj);
    }
  }

  onStream(callObj) {
    callObj.on('stream', stream => {
      if (this.currentStream) { this.currentStream.close(); }
      this.currentStream = callObj;

      this.controller.streamVideo(stream, callObj);

      callObj.on('close', () => this.onStreamClose(callObj.peer))
    });
  }

  onStreamClose(peerId) {
    this.currentStream.localStream.getTracks().forEach(track => track.stop());
    this.currentStream = null;

    this.controller.closeVideo(peerId);
  }*/
}


export default Broadcast;
