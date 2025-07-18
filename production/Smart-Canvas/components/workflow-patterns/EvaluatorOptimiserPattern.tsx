import React from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { BrainCircuit, ArrowRightCircle, Repeat, CheckCircle2, XCircle } from 'lucide-react';

export default function EvaluatorOptimiserPattern() {
  return (
    <Card className="flex flex-col gap-6 p-6 bg-black/60 border border-[#fff5f5]/10 text-[#fff5f5] w-full max-w-3xl mx-auto">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-[#fff5f5]/10 p-3 mb-2"><Input className="w-40" placeholder="User Input" /></div>
            <span className="text-xs text-[#fff5f5]/70">Input</span>
          </div>
          <ArrowRightCircle size={28} className="mx-2 text-[#fff5f5]/60" />
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-[#fff5f5]/10 p-3 mb-2 flex items-center gap-2">
              <BrainCircuit size={22} className="text-[#fff5f5]" />
              <span className="text-sm">Generator</span>
            </div>
            <span className="text-xs text-[#fff5f5]/70">LLM Generator</span>
          </div>
          <ArrowRightCircle size={28} className="mx-2 text-[#fff5f5]/60" />
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-[#fff5f5]/10 p-3 mb-2"><Input className="w-40" placeholder="Solution" disabled /></div>
            <span className="text-xs text-[#fff5f5]/70">Solution</span>
          </div>
          <ArrowRightCircle size={28} className="mx-2 text-[#fff5f5]/60" />
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-[#fff5f5]/10 p-3 mb-2 flex items-center gap-2">
              <BrainCircuit size={22} className="text-[#fff5f5]" />
              <span className="text-sm">Evaluator</span>
            </div>
            <span className="text-xs text-[#fff5f5]/70">LLM Evaluator</span>
          </div>
        </div>
        <div className="flex items-center gap-8 mt-4">
          <div className="flex flex-col items-center">
            <Repeat size={24} className="mb-2 text-[#fff5f5]/60" />
            <span className="text-xs text-[#fff5f5]/70">Rejected: Loop to Generator</span>
          </div>
          <div className="flex flex-col items-center">
            <CheckCircle2 size={24} className="mb-2 text-green-400" />
            <div className="rounded-full bg-[#fff5f5]/10 p-3 mb-2"><Input className="w-40" placeholder="Output" disabled /></div>
            <span className="text-xs text-[#fff5f5]/70">Accepted: Output</span>
          </div>
        </div>
      </div>
      <Button className="self-end bg-[#fff5f5]/10 text-[#fff5f5] border border-[#fff5f5]/20 hover:bg-[#fff5f5]/20">Run Example</Button>
    </Card>
  );
} 