"use client";

import * as React from "react";
import { Bot, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AgentBuilderProps {
  onSubmit?: (data: AgentBuilderFormData, close: () => void) => void;
}

interface AgentBuilderFormData {
  description: string;
}

const AgentBuilder: React.FC<AgentBuilderProps> = ({ onSubmit }) => {
  const [formData, setFormData] = React.useState<AgentBuilderFormData>({
    description: "",
  });
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (onSubmit) {
      await onSubmit(formData, () => setOpen(false));
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-1.5 hover:bg-white/20 hover:scale-105" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          backdropFilter: 'blur(5px)',
        }}>
          <Wand2 size={16} />
          Agent Builder
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>🤖 Create New Agent Flow</DialogTitle>
            <DialogDescription>
              Describe what you want your agent to do, and we'll automatically generate a complete workflow using AI and 300+ tools.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">What should your agent do?</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Examples:
• Create a customer service agent that handles refunds via email
• Build a social media manager that posts to Twitter and LinkedIn
• Make a research assistant that finds and summarizes news articles
• Design a meeting scheduler that coordinates with Google Calendar
• Create a content creator that generates blog posts and images"
                className="min-h-[120px] resize-none"
                value={formData.description}
                onChange={handleChange}
                onKeyDown={(e) => {
                  // Prevent event propagation to parent components (React Flow)
                  e.stopPropagation();
                }}
                onKeyUp={(e) => {
                  // Prevent event propagation to parent components (React Flow)
                  e.stopPropagation();
                }}
                onKeyPress={(e) => {
                  // Prevent event propagation to parent components (React Flow)
                  e.stopPropagation();
                }}
                required
              />
              <p className="text-xs text-blue-600">
                💡 Be specific about what tools or platforms you want to use. We have 300+ integrations available!
              </p>
            </div>

            {/* Info about automatic configuration */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 mt-0.5">ℹ️</div>
                <div className="text-sm text-blue-800">
                  <strong>Fully Automated:</strong> We'll automatically configure AI models and tool integrations.
                  No API keys needed - just describe what you want!
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="gap-2" disabled={loading}>
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-slate-700" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {loading ? "🔮 Creating Magic..." : "🚀 Generate Agent Flow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgentBuilder; 