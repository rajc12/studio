"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Send } from "lucide-react";
import { useCollection, useFirestore } from "@/firebase";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, query, orderBy, serverTimestamp } from "firebase/firestore";

interface ChatMessage {
    id?: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: any;
}

interface GameChatProps {
    lobbyId: string;
    userId: string;
}

export function GameChat({ lobbyId, userId }: GameChatProps) {
    const [input, setInput] = useState('');
    const firestore = useFirestore();

    const messagesRef = collection(firestore, 'lobbies', lobbyId, 'chat_messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    const { data: messages } = useCollection<ChatMessage>(messagesQuery);
    
    const userPlayer = useCollection<Player>(collection(firestore, 'lobbies', lobbyId, 'players')).data?.find(p => p.id === userId);


    const handleSend = () => {
        if(input.trim() && userPlayer) {
            const newMessage: ChatMessage = {
                userId,
                userName: userPlayer.name,
                text: input.trim(),
                timestamp: serverTimestamp()
            };
            addDocumentNonBlocking(messagesRef, newMessage);
            setInput('');
        }
    };

    return (
        <div className="absolute bottom-4 left-4 z-10 w-80">
            <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Game Chat</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-40 w-full pr-4">
                        <div className="space-y-2 text-sm">
                            {messages?.map((msg) => (
                                <div key={msg.id}>
                                    <span className="font-bold text-primary">{msg.userName}: </span>
                                    <span>{msg.text}</span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter>
                    <div className="flex w-full gap-2">
                        <Input 
                            placeholder="Say something..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <Button size="icon" onClick={handleSend}><Send className="w-4 h-4" /></Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
