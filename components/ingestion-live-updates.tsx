"use client";

import { Badge } from "@workspace/ui/components/badge";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ConnectionState =
  | "connecting"
  | "subscribed"
  | "timed_out"
  | "channel_error"
  | "closed";

type IngestionLiveUpdatesProps = {
  onRealtimeEvent?: () => void;
  selectedItemId: string | null;
  selectedRunId: string | null;
};

function getChannelLabel(state: ConnectionState) {
  switch (state) {
    case "subscribed":
      return "Live updates on";
    case "connecting":
      return "Connecting live updates";
    case "timed_out":
      return "Live updates delayed";
    case "channel_error":
      return "Live updates error";
    case "closed":
      return "Live updates off";
    default:
      return "Live updates";
  }
}

function getChannelVariant(state: ConnectionState) {
  switch (state) {
    case "subscribed":
      return "secondary" as const;
    case "connecting":
      return "outline" as const;
    case "timed_out":
    case "channel_error":
      return "destructive" as const;
    case "closed":
      return "ghost" as const;
    default:
      return "outline" as const;
  }
}

export function IngestionLiveUpdates({
  onRealtimeEvent,
  selectedItemId,
  selectedRunId,
}: IngestionLiveUpdatesProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRealtimeEvent = useEffectEvent(() => {
    if (refreshTimeoutRef.current) {
      return;
    }

    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null;
      onRealtimeEvent?.();
    }, 400);
  });

  useEffect(() => {
    const supabase = createClient();
    const scope = [selectedRunId ?? "all-runs", selectedItemId ?? "all-items"].join(":");
    const channel = supabase
      .channel(`ingestion-live:${scope}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crawl_runs",
        },
        scheduleRealtimeEvent,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "source_files",
        },
        scheduleRealtimeEvent,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "source_items",
        },
        scheduleRealtimeEvent,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ingestion_jobs",
        },
        scheduleRealtimeEvent,
      )
      .subscribe((status: ConnectionState) => {
        setConnectionState(status);
      });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [onRealtimeEvent, selectedItemId, selectedRunId]);

  return (
    <div className="flex items-center justify-end">
      <Badge variant={getChannelVariant(connectionState)}>{getChannelLabel(connectionState)}</Badge>
    </div>
  );
}
