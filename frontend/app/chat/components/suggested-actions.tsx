"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { memo } from "react";

interface SuggestedActionsProps {
  chatId: string;
  onSuggestedAction: (action: string) => void;
}
function PureSuggestedActions({
  chatId,
  onSuggestedAction,
}: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: "Summarize recent news",
      label: "Get a concise summary of the latest news on a topic",
      action:
        "Search the web for the latest news and research about AI and healthcare from the last 30 days. Summarize key headlines, link sources, and provide 3 short insights about what changed.",
    },
    {
      title: "Compare product reviews",
      label: "Compare recent reviews and buying advice",
      action:
        "Find recent expert and user reviews for top noise-cancelling headphones released this year. Compare strengths, weaknesses, approximate price ranges, and recommend the best value pick.",
    },
    {
      title: "Regulatory / guidance lookup",
      label: "Find recent regulatory guidance or recalls",
      action:
        "Search for any recent regulatory updates or recalls related to medical devices or software in the last 6 months and summarize implications for users.",
    },
    {
      title: "Plan a short trip",
      label: "Weather, itinerary and packing tips",
      action:
        "Plan a 3-day itinerary for Lisbon next month: include weather expectations, three recommended activities, approximate budgets, and packing suggestions.",
    }
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-2 w-full pb-2">
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: 20,
          }}
          transition={{
            delay: 0.05 * index,
          }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? "hidden sm:block" : "block"}
        >
          <Button
            variant="ghost"
            onClick={() => {
              onSuggestedAction(suggestedAction.action);
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm gap-1 sm:flex-col w-full h-auto justify-start items-start sm:items-stretch"
          >
            <span className="font-medium truncate">{suggestedAction.title}</span>
            <span className="text-muted-foreground truncate">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
export const SuggestedActions = memo(PureSuggestedActions);
