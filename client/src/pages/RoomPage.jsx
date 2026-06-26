import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Users, Copy, Check, AlertCircle } from 'lucide-react';

const VideoPlayer = ({ stream, isLocal, muted, username }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-surface rounded-2xl overflow-hidden shadow-xl border border-white/5 min-h-48">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted || isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Video className="w-8 h-8 text-primary/60" />
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-medium text-white">
        {isLocal ? 'You' : (username || 'Participant')}
      </div>
    </div>
  );
};

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { localStream, peers, initLocalStream, toggleAudio, toggleVideo, toggleScreenShare, isScreenSharing, disconnect } = useWebRTC(roomId);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [copied, setCopied] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);

  // Auto-start local camera when entering room
  useEffect(() => {
    if (!cameraStarted) {
      setCameraStarted(true);
      initLocalStream();
    }
  }, [initLocalStream, cameraStarted]);

  useEffect(() => {
    if (socket) {
      socket.emit('join-room', { roomId }, (response) => {
        if (response?.error) {
          setJoinError(response.error);
        }
      });
    }
  }, [socket, roomId]);

  const handleToggleAudio = () => {
    toggleAudio();
    setIsMuted(prev => !prev);
  };

  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoOff(prev => !prev);
  };

  const handleLeave = () => {
    disconnect();
    navigate('/');
  };

  const handleCopyRoomId = async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalParticipants = 1 + peers.length;
  const gridClass =
    totalParticipants === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
    totalParticipants === 2 ? 'grid-cols-1 md:grid-cols-2' :
    totalParticipants <= 4 ? 'grid-cols-2' :
    'grid-cols-2 md:grid-cols-3';

  return (
    <div className="min-h-screen flex flex-col bg-background p-3 md:p-4">
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-3 glass-panel mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Video className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Room: <span className="font-mono text-primary">{roomId}</span></h2>
            <p className="text-xs text-muted flex items-center gap-1">
              <Users className="w-3 h-3" />
              {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleCopyRoomId}
          className="btn-secondary flex items-center gap-2 text-xs py-2 px-3"
          title="Copy Room ID to share"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Share'}
        </button>
      </header>

      {/* Error Banner */}
      {joinError && (
        <div className="flex items-center gap-2 bg-accent/10 border border-accent/30 text-accent px-4 py-3 rounded-xl mb-4 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {joinError}
        </div>
      )}

      {/* Video Grid */}
      <main className={`flex-1 grid gap-4 ${gridClass} content-start`}>
        <VideoPlayer stream={localStream} isLocal={true} />
        {peers.map(peer => (
          <VideoPlayer key={peer.socketId} stream={peer.stream} isLocal={false} />
        ))}
      </main>

      {/* Controls */}
      <footer className="mt-4 flex justify-center pb-2">
        <div className="glass-panel px-6 py-3 flex items-center gap-3">
          <button
            id="toggle-audio"
            onClick={handleToggleAudio}
            title={isMuted ? 'Unmute' : 'Mute'}
            className={`p-3.5 rounded-full transition-all duration-200 ${isMuted ? 'bg-accent/20 text-accent ring-1 ring-accent/40' : 'bg-white/8 hover:bg-white/15 text-white'}`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            id="toggle-video"
            onClick={handleToggleVideo}
            title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
            className={`p-3.5 rounded-full transition-all duration-200 ${isVideoOff ? 'bg-accent/20 text-accent ring-1 ring-accent/40' : 'bg-white/8 hover:bg-white/15 text-white'}`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            id="toggle-screenshare"
            onClick={toggleScreenShare}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            className={`p-3.5 rounded-full transition-all duration-200 ${isScreenSharing ? 'bg-primary text-white ring-1 ring-primary/60 shadow-lg shadow-primary/20' : 'bg-white/8 hover:bg-white/15 text-white'}`}
          >
            <MonitorUp className="w-5 h-5" />
          </button>

          <div className="w-px h-9 bg-white/10 mx-1" />

          <button
            id="leave-room"
            onClick={handleLeave}
            title="Leave meeting"
            className="p-3.5 rounded-full bg-accent hover:bg-accent/90 active:scale-95 text-white shadow-lg shadow-accent/25 transition-all duration-200"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
