import React from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { BrainCircuit, ArrowRightCircle } from 'lucide-react';

export default function PromptChainingPattern() {
  return (
    <Card className="flex flex-col gap-6 p-6 bg-black/60 border border-[#fff5f5]/10 text-[#fff5f5] w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <div className="rounded-full bg-[#fff5f5]/10 p-3 mb-2"><Input className="w-40" placeholder="User Input" /></div>
          <span className="text-xs text-[#fff5f5]/70">Input</span>
        </div>
        <ArrowRightCircle size={28} className="mx-2 text-[#fff5f5]/60" />
        <div className="flex flex-col items-center">
          <div className="rounded-full bg-[#fff5f5]/10 p-3 mb-2 flex items-center gap-2">
            <BrainCircuit size={22} className="text-[#fff5f5]" />
            <span className="text-sm">Agent 1</span>
          </div>
          <span className="text-xs text-[#fff5f5]/70">Step 1</span>
        </div>
        <ArrowRightCircle size={28} className="mx-2 text-[#fff5f5]/60" />
        <div className="flex flex-col items-center">
          <div className="rounded-full bg-[#fff5f5]/10 p-3 mb-2 flex items-center gap-2">
            <BrainCircuit size={22} className="text-[#fff5f5]" />
            <span className="text-sm">Agent 2</span>
          </div>
          <span className="text-xs text-[#fff5f5]/70">Step 2</span>
        </div>
        <ArrowRightCircle size={28} className="mx-2 text-[#fff5f5]/60" />
        <div className="flex flex-col items-center">
          <div className="rounded-full bg-[#fff5f5]/10 p-3 mb-2"><Input className="w-40" placeholder="Output" disabled /></div>
          <span className="text-xs text-[#fff5f5]/70">Output</span>
        </div>
      </div>
      <Button className="self-end bg-[#fff5f5]/10 text-[#fff5f5] border border-[#fff5f5]/20 hover:bg-[#fff5f5]/20">Run Example</Button>
    </Card>
  );
} 