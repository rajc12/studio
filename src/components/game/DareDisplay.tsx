"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

interface DareDisplayProps {
    dareText: string;
    onDone: () => void;
}

export function DareDisplay({ dareText, onDone }: DareDisplayProps) {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md animate-in fade-in zoom-in-90">
                <CardHeader className="items-center text-center">
                    <Zap className="w-12 h-12 text-yellow-400 mb-2" />
                    <CardTitle className="text-3xl font-extrabold text-primary">You've Been Dared!</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-xl font-medium text-foreground">
                        {dareText}
                    </p>
                    <p className="text-sm text-muted-foreground mt-4">
                        (Your turn continues. The dare is over after your turn.)
                    </p>
                </CardContent>
                <CardFooter>
                    <Button onClick={onDone} className="w-full">Done</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
