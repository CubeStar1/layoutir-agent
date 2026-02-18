import { useQueryClient } from "@tanstack/react-query";
import { Conversation } from "@/app/chat/types";
import useUser from "@/hooks/use-user";

export function useChatHistory() {
  const queryClient = useQueryClient();
  const { data: user } = useUser();

  const addOptimisticChat = (chatId: string, title: string) => {
    if (!user?.id) return;

    const optimisticChat: Conversation = {
      id: chatId,
      title: title.substring(0, 40) || "New Chat",
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    queryClient.setQueryData(['chat-history', user.id], (oldData: any) => {
      if (!oldData) {
        return {
          pages: [[optimisticChat]],
          pageParams: [0],
        };
      }

      const newPages = [...oldData.pages];
      if (newPages.length > 0) {
        newPages[0] = [optimisticChat, ...newPages[0]];
      } else {
        newPages[0] = [optimisticChat];
      }

      return {
        ...oldData,
        pages: newPages,
      };
    });
  };

  return { addOptimisticChat };
}
