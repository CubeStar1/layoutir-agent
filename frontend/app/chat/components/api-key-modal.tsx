"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApiKeys, ApiKeys } from "../hooks/use-api-keys";
import { Eye, EyeOff, Key } from "lucide-react";
import { useState } from "react";

const providers: { key: keyof ApiKeys; label: string; placeholder: string }[] = [
  { key: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { key: 'google', label: 'Google Gemini', placeholder: 'AIza...' },
  { key: 'xai', label: 'xAI (Grok)', placeholder: 'xai-...' },
  { key: 'groq', label: 'Groq', placeholder: 'gsk_...' },
  { key: 'cerebras', label: 'Cerebras', placeholder: 'csk-...' },
];

export function ApiKeyModal() {
  const { isOpen, setIsOpen, apiKeys, setApiKey } = useApiKeys();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bring Your Own Keys</DialogTitle>
          <DialogDescription>
            Enter your API keys to use your own quotas. Keys are stored locally in your browser and never saved to our servers.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {providers.map((provider) => (
            <div key={provider.key} className="grid gap-2">
              <Label htmlFor={provider.key}>{provider.label}</Label>
              <div className="relative">
                <Input
                  id={provider.key}
                  type={showKeys[provider.key] ? "text" : "password"}
                  placeholder={provider.placeholder}
                  value={apiKeys[provider.key] || ''}
                  onChange={(e) => setApiKey(provider.key, e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => toggleShowKey(provider.key)}
                >
                  {showKeys[provider.key] ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
