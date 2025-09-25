"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Send } from "lucide-react";

export function GameChat() {
    const [messages, setMessages] = useState([
        { user: 'System', text: 'Welcome to UnoSync!' },
        { user: 'AI Player 1', text: 'Good luck!' }
    ]);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if(input.trim()) {
            setMessages([...messages, { user: 'You', text: input.trim() }]);
            setInput('');
        }
    };

    return (
        <div className="absolute bottom-4 left-4 z-10 w-64">
            <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Game Chat</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-40 w-full pr-4">
                        <div className="space-y-2 text-sm">
                            {messages.map((msg, index) => (
                                <div key={index}>
                                    <span className="font-bold text-primary">{msg.user}: </span>
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
