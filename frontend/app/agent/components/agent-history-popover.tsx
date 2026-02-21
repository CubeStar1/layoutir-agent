"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isToday, isYesterday, subWeeks } from "date-fns";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HistoryIcon, PlusIcon, TrashIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import useUser from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Conversation } from "@/app/agent/types";
import { cn } from "@/lib/utils";

interface AgentHistoryPopoverProps {
  currentChatId: string;
}

export function AgentHistoryPopover({ currentChatId }: AgentHistoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useUser();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["chat-history", user?.id],
      queryFn: async ({ pageParam = 0 }) => {
        const res = await fetch(`/api/history?offset=${pageParam}&limit=20`);
        if (!res.ok) throw new Error("Failed to fetch history");
        return res.json() as Promise<Conversation[]>;
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, _allPages, lastPageParam) => {
        if (lastPage.length === 0) return undefined;
        return lastPageParam + 20;
      },
      enabled: !!user && open,
    });

  const deleteMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const res = await fetch(`/api/chat?id=${chatId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return chatId;
    },
    onSuccess: (deletedChatId) => {
      queryClient.setQueryData(
        ["chat-history", user?.id],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: Conversation[]) =>
              page.filter((c) => c.id !== deletedChatId)
            ),
          };
        }
      );
      toast.success("Chat deleted");
      if (deletedChatId === currentChatId) {
        router.push("/agent");
      }
    },
    onError: () => toast.error("Failed to delete chat"),
  });

  const conversations = data?.pages.flat() || [];

  const grouped = groupByDate(conversations);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <HistoryIcon className="size-4" />
            <span className="sr-only">Chat history</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-72 p-0"
          sideOffset={8}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">History</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => {
                setOpen(false);
                router.push("/agent");
              }}
            >
              <PlusIcon className="size-4" />
              <span className="sr-only">New chat</span>
            </Button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              <div className="flex flex-col gap-1 p-1">
                {grouped.map(
                  ({ label, chats }) =>
                    chats.length > 0 && (
                      <div key={label}>
                        <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          {label}
                        </div>
                        {chats.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => {
                              setOpen(false);
                              router.push(`/agent/${chat.id}`);
                            }}
                            className={cn(
                              "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                              chat.id === currentChatId && "bg-accent"
                            )}
                          >
                            <span className="flex-1 truncate">{chat.title}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(chat.id);
                                setShowDeleteDialog(true);
                              }}
                              className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                            >
                              <TrashIcon className="size-3.5" />
                            </button>
                          </button>
                        ))}
                      </div>
                    )
                )}

                {hasNextPage && (
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                  >
                    {isFetchingNextPage ? (
                      <Loader2Icon className="size-3 animate-spin" />
                    ) : (
                      "Load more"
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function groupByDate(chats: Conversation[]) {
  const oneWeekAgo = subWeeks(new Date(), 1);

  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const lastWeek: Conversation[] = [];
  const older: Conversation[] = [];

  for (const chat of chats) {
    const d = new Date(chat.updated_at);
    if (isToday(d)) today.push(chat);
    else if (isYesterday(d)) yesterday.push(chat);
    else if (d > oneWeekAgo) lastWeek.push(chat);
    else older.push(chat);
  }

  return [
    { label: "Today", chats: today },
    { label: "Yesterday", chats: yesterday },
    { label: "Last 7 days", chats: lastWeek },
    { label: "Older", chats: older },
  ];
}
