import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const useWebRTC = (roomId) => {
  const socket = useSocket();
  const [peers, setPeers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const peersRef = useRef({});
  const localStreamRef = useRef(null);

  const initLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Error accessing media devices.', err);
      return null;
    }
  }, []);

  const createPeer = useCallback((targetSocketId, stream, isInitiator) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);
    
    stream.getTracks().forEach(track => {
      peer.addTrack(track, stream);
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('new-ice-candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    peer.ontrack = (event) => {
      setPeers(prev => {
        const existing = prev.find(p => p.socketId === targetSocketId);
        if (existing) return prev;
        return [...prev, { socketId: targetSocketId, stream: event.streams[0] }];
      });
    };

    if (isInitiator) {
      peer.createOffer().then(offer => {
        peer.setLocalDescription(offer);
        socket.emit('video-offer', { targetSocketId, sdp: offer });
      });
    }

    peersRef.current[targetSocketId] = peer;
    return peer;
  }, [socket]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleUserJoined = async ({ socketId }) => {
      const stream = localStreamRef.current || await initLocalStream();
      createPeer(socketId, stream, true);
    };

    const handleVideoOffer = async ({ senderSocketId, sdp }) => {
      const stream = localStreamRef.current || await initLocalStream();
      const peer = createPeer(senderSocketId, stream, false);
      await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('video-answer', { targetSocketId: senderSocketId, sdp: answer });
    };

    const handleVideoAnswer = async ({ senderSocketId, sdp }) => {
      const peer = peersRef.current[senderSocketId];
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    };

    const handleNewIceCandidate = async ({ senderSocketId, candidate }) => {
      const peer = peersRef.current[senderSocketId];
      if (peer) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate', e);
        }
      }
    };

    const handleUserLeft = ({ socketId }) => {
      const peer = peersRef.current[socketId];
      if (peer) {
        peer.close();
        delete peersRef.current[socketId];
      }
      setPeers(prev => prev.filter(p => p.socketId !== socketId));
    };

    socket.on('user-joined', handleUserJoined);
    socket.on('video-offer', handleVideoOffer);
    socket.on('video-answer', handleVideoAnswer);
    socket.on('new-ice-candidate', handleNewIceCandidate);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('user-joined', handleUserJoined);
      socket.off('video-offer', handleVideoOffer);
      socket.off('video-answer', handleVideoAnswer);
      socket.off('new-ice-candidate', handleNewIceCandidate);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, roomId, createPeer, initLocalStream]);

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = displayStream.getVideoTracks()[0];
        
        // Replace track for all peers
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });

        // Update local stream state
        const newStream = new MediaStream([videoTrack, localStream.getAudioTracks()[0]]);
        setLocalStream(newStream);
        setIsScreenSharing(true);

        videoTrack.onended = () => {
          stopScreenShare();
        };
      } else {
        stopScreenShare();
      }
    } catch (err) {
      console.error('Failed to share screen', err);
    }
  };

  const stopScreenShare = async () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    
    Object.values(peersRef.current).forEach(peer => {
      const sender = peer.getSenders().find(s => s.track.kind === 'video');
      if (sender) sender.replaceTrack(videoTrack);
    });

    setLocalStream(localStreamRef.current);
    setIsScreenSharing(false);
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
    }
  };

  const toggleVideo = () => {
    if (localStream && !isScreenSharing) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
    }
  };

  const disconnect = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    Object.values(peersRef.current).forEach(peer => peer.close());
    peersRef.current = {};
    setPeers([]);
    if (socket) {
      socket.emit('leave-room');
    }
  };

  return {
    localStream,
    peers,
    initLocalStream,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    isScreenSharing,
    disconnect
  };
};
