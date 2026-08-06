import { useEffect , useRef } from "react";
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useSocket() {
    const socketRef = useRef(null);

    if(!socketRef.current) {
      socketRef.current = io(SOCKET_URL ,  {autoConnect: true});
    }

    useEffect(()=>{
        const socket = socketRef.current;
        
        return () => {
            socket.disconnect();
        }
    } , []);

    return socketRef.current;
}