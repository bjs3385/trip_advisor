"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check, GripVertical, Pencil, Route, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CATEGORY_BAR, CATEGORY_COLOR, CATEGORY_GLOW, getCityStyle, type LocationCategory, type LocationEntry, type TransitRole } from "@/data/itinerary";
import { useItineraryStore } from "@/store/itinerary";
import { cn } from "@/lib/utils";
import { CATEGORY_ICON, CATEGORY_OPTIONS } from "./constants";
import { ThemedTimePicker } from "./ThemedTimePicker";
import { BOOKMARK_DRAG_MIME, bookmarkTypeToCategory, roleForCategory, timeToMin } from "./utils";

const TIME_STEP_MINUTES = 10;
const DAY_END_MINUTES = 23 * 60 + 30;
const ROW_HEIGHT_PX = 36;
const ROW_GAP_PX = 6;
const GROUP_MEMBER_GAP_PX = 10;
const ROW_STRIDE_PX = ROW_HEIGHT_PX + ROW_GAP_PX;
const GROUP_HEADER_HEIGHT_PX = 24;
const HOLD_TO_REORDER_MS = 180;

type ResizeHandleSide = "start" | "end";
type DropPlacement = "before" | "after";
type TimetableActivity = LocationEntry & { index: number };
type TimetableGroup = {
  key: string;
  index: number;
  time: string;
  endTime?: string;
  startMin: number;
  endMin: number;
  members: TimetableActivity[];
  primaryCategory: LocationCategory;
  compactTransitPair?: boolean;
  virtualGroup?: boolean;
};

function minToTime(minute: number) {
  const safeMinute = Math.max(0, Math.min(DAY_END_MINUTES, minute));
  const hours = Math.floor(safeMinute / 60);
  const mins = safeMinute % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function snapToStep(minute: number) {
  return Math.round(minute / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
}

function createGroupId() {
  return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isTransitPair(members: TimetableActivity[]) {
  if (members.length !== 2) return false;
  if (members[0].category !== "TRANSIT" || members[1].category !== "TRANSIT") return false;
  const roles = [members[0].transitRole, members[1].transitRole];
  return roles.includes("DEPARTURE") && roles.includes("ARRIVAL");
}

function transitPairOrdered(members: TimetableActivity[]): [TimetableActivity, TimetableActivity] | null {
  if (!isTransitPair(members)) return null;
  const departure = members.find((m) => m.transitRole === "DEPARTURE")!;
  const arrival = members.find((m) => m.transitRole === "ARRIVAL")!;
  return [departure, arrival];
}

interface DayTimetableProps {
  onBack: () => void;
}

export function DayTimetable({ onBack }: DayTimetableProps) {
  const activeDay = useItineraryStore((s) => s.activeDay);
  const setActiveDay = useItineraryStore((s) => s.setActiveDay);
  const itinerary = useItineraryStore((s) => s.itinerary);
  const days = useItineraryStore((s) => s.days);
  const updateLocation = useItineraryStore((s) => s.updateLocation);
  const removeLocation = useItineraryStore((s) => s.removeLocation);
  const setDayLocations = useItineraryStore((s) => s.setDayLocations);
  const setSelectedLocation = useItineraryStore((s) => s.setSelectedLocation);
  const selectedLocation = useItineraryStore((s) => s.selectedLocation);
  const bookmarks = useItineraryStore((s) => s.bookmarks);
  const addLocation = useItineraryStore((s) => s.addLocation);
  const routeSelectedLocationKeys = useItineraryStore((s) => s.routeSelectedLocationKeys);
  const routeSelectedDays = useItineraryStore((s) => s.routeSelectedDays);
  const toggleRouteLocationSelection = useItineraryStore((s) => s.toggleRouteLocationSelection);
  const computeSelectedRoutes = useItineraryStore((s) => s.computeSelectedRoutes);
  const setGroupName = useItineraryStore((s) => s.setGroupName);
  const setFocusGroupTarget = useItineraryStore((s) => s.setFocusGroupTarget);
  const cityStyleKeys = useItineraryStore((s) => s.cityStyleKeys);

  const dayData = days.find((d) => d.day === activeDay) ?? days[0];
  const itineraryDay = itinerary[activeDay] ?? itinerary[1] ?? { locations: [], routes: [], budget: [] };
  const selectedRouteCount = routeSelectedDays.length + routeSelectedLocationKeys.length;
  const cityStyle = getCityStyle(cityStyleKeys[dayData.city] ?? dayData.city);
  const locations = [...itineraryDay.locations].sort((a, b) => a.time.localeCompare(b.time));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    time: string;
    category: LocationCategory;
    transitRole?: TransitRole;
    endTime?: string;
  }>({
    name: "",
    time: "",
    category: "SIGHT",
    transitRole: undefined,
    endTime: undefined,
  });
  const [draggingHandle, setDraggingHandle] = useState<{
    groupKey: string;
    side: ResizeHandleSide;
  } | null>(null);
  const [draggingBar, setDraggingBar] = useState<{
    groupKey: string;
    offsetY: number;
  } | null>(null);
  const [draggedLabelId, setDraggedLabelId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPlacement, setDropPlacement] = useState<DropPlacement>("after");
  const [bookmarkDragActive, setBookmarkDragActive] = useState(false);
  const [bookmarkDropMin, setBookmarkDropMin] = useState<number | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const reorderHoldTimerRef = useRef<number | null>(null);
  const groupCardRefs = useRef(new Map<string, HTMLDivElement>());
  const dragOriginGroupKeyRef = useRef<string | null>(null);
  const dragOutcomeRef = useRef<"merge" | "reorder" | null>(null);
  const reorderSessionRef = useRef<{
    pointerId: number;
    groupKey: string;
    startY: number;
    appliedSteps: number;
    activated: boolean;
  } | null>(null);

  useEffect(() => {
    if (editingId) nameRef.current?.focus();
  }, [editingId]);

  useEffect(() => {
    return () => {
      if (reorderHoldTimerRef.current) {
        window.clearTimeout(reorderHoldTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onStart = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes(BOOKMARK_DRAG_MIME)) {
        setBookmarkDragActive(true);
      }
    };
    const onEnd = () => {
      setBookmarkDragActive(false);
      setBookmarkDropMin(null);
    };
    document.addEventListener("dragstart", onStart);
    document.addEventListener("dragend", onEnd);
    document.addEventListener("drop", onEnd);
    return () => {
      document.removeEventListener("dragstart", onStart);
      document.removeEventListener("dragend", onEnd);
      document.removeEventListener("drop", onEnd);
    };
  }, []);

  const activities: TimetableActivity[] = locations.map((loc, index) => ({ ...loc, index }));

  const grouped: { key: string; members: TimetableActivity[]; virtualGroup?: boolean }[] = [];
  const handledIds = new Set<string>();
  const handledGroupIds = new Set<string>();
  for (let index = 0; index < activities.length; index += 1) {
    const activity = activities[index];
    if (handledIds.has(activity.id)) continue;

    if (activity.groupId) {
      if (handledGroupIds.has(activity.groupId)) continue;
      const members = activities.filter((item) => item.groupId === activity.groupId);
      members.forEach((member) => handledIds.add(member.id));
      handledGroupIds.add(activity.groupId);
      grouped.push({ key: activity.groupId, members });
      continue;
    }

    const next = activities[index + 1];
    if (next && !next.groupId && isTransitPair([activity, next])) {
      handledIds.add(activity.id);
      handledIds.add(next.id);
      grouped.push({
        key: `transit-pair-${activity.id}-${next.id}`,
        members: [activity, next],
        virtualGroup: true,
      });
      index += 1;
      continue;
    }

    handledIds.add(activity.id);
    grouped.push({ key: activity.id, members: [activity] });
  }

  const groups: TimetableGroup[] = grouped
    .map(({ key, members, virtualGroup }) => {
      const sortedMembers = [...members].sort((a, b) => a.index - b.index);
      const leader = sortedMembers[0];
      return {
        key,
        index: 0,
        time: leader.time,
        endTime: leader.endTime,
        startMin: timeToMin(leader.time),
        endMin: 0,
        members: sortedMembers,
        primaryCategory: leader.category,
        compactTransitPair: isTransitPair(sortedMembers),
        virtualGroup,
      };
    })
    .sort((a, b) => a.startMin - b.startMin || a.members[0].index - b.members[0].index)
    .map((group, index, arr) => {
      const fallbackEnd = Math.min(DAY_END_MINUTES, group.startMin + 120);
      const explicitEnd = group.endTime
        ? Math.max(group.startMin + TIME_STEP_MINUTES, Math.min(DAY_END_MINUTES, timeToMin(group.endTime)))
        : undefined;
      const transitPairEnd = group.compactTransitPair
        ? Math.max(group.startMin + TIME_STEP_MINUTES, Math.min(DAY_END_MINUTES, timeToMin(group.members[1].time)))
        : undefined;
      const nextStart = arr[index + 1]?.startMin;
      return {
        ...group,
        index,
        endMin:
          transitPairEnd ??
          (nextStart !== undefined && nextStart > group.startMin
            ? nextStart
            : explicitEnd ?? fallbackEnd),
      };
    });

  const groupByLocationId = new Map<string, TimetableGroup>();
  for (const group of groups) {
    for (const member of group.members) {
      groupByLocationId.set(member.id, group);
    }
  }

  const startMin = groups.length > 0 ? Math.floor(groups[0].startMin / 60) * 60 : 9 * 60;
  const lastGroup = groups[groups.length - 1];
  const endMin = lastGroup ? Math.ceil(lastGroup.endMin / 60) * 60 : 18 * 60;
  const totalMin = Math.max(60, endMin - startMin);

  const hours: number[] = [];
  for (let minute = startMin; minute <= endMin; minute += 60) hours.push(minute);

  const activitiesRef = useRef(activities);
  const groupsRef = useRef(groups);
  const totalMinRef = useRef(totalMin);
  const activeDayRef = useRef(activeDay);

  useEffect(() => {
    activitiesRef.current = activities;
    groupsRef.current = groups;
    totalMinRef.current = totalMin;
    activeDayRef.current = activeDay;
  }, [activities, groups, totalMin, activeDay]);

  const pct = (minute: number) => ((minute - startMin) / totalMin) * 100;

  const getGroupByLocationId = (locationId: string) =>
    groupsRef.current.find((group) => group.members.some((member) => member.id === locationId));

  const getGroupIndexByKey = (groupKey: string) =>
    groupsRef.current.findIndex((group) => group.key === groupKey);

  const updateMembers = (members: TimetableActivity[], updater: (member: TimetableActivity) => LocationEntry) => {
    members.forEach((member) => {
      updateLocation(activeDayRef.current, updater(member));
    });
  };

  const reorderLocations = (orderedIds: string[]) => {
    const baseLocations = [
      ...(useItineraryStore.getState().itinerary[activeDayRef.current]?.locations ?? []),
    ];
    const byId = new Map(baseLocations.map((location) => [location.id, location]));
    const nextLocations = orderedIds
      .map((id) => byId.get(id))
      .filter((location): location is LocationEntry => Boolean(location));

    if (nextLocations.length === baseLocations.length) {
      setDayLocations(activeDayRef.current, nextLocations);
    }
  };

  const moveIdRelative = (
    ids: string[],
    movingId: string,
    targetId: string,
    placement: DropPlacement
  ) => {
    const withoutMoving = ids.filter((id) => id !== movingId);
    const targetIndex = withoutMoving.indexOf(targetId);
    if (targetIndex === -1) return ids;
    const insertIndex = placement === "before" ? targetIndex : targetIndex + 1;
    const next = [...withoutMoving];
    next.splice(insertIndex, 0, movingId);
    return next;
  };

  const setGroupSchedule = (groupKey: string, time: string, endTime?: string) => {
    const group = groupsRef.current.find((item) => item.key === groupKey);
    if (!group) return;

    if (group.compactTransitPair) {
      const nextStart = timeToMin(time);
      const delta = nextStart - group.startMin;
      updateMembers(group.members, (member) => ({
        ...member,
        time: minToTime(timeToMin(member.time) + delta),
        endTime: undefined,
      }));
      return;
    }

    updateMembers(group.members, (member) => ({
      ...member,
      time,
      endTime,
    }));
  };

  const setTransitPairEnd = (groupKey: string, nextEnd: string) => {
    const group = groupsRef.current.find((item) => item.key === groupKey);
    const arrival = group?.compactTransitPair ? group.members[1] : null;
    if (!group || !arrival) return;

    updateLocation(activeDayRef.current, {
      ...arrival,
      time: nextEnd,
      endTime: undefined,
    });
  };

  const setTransitPairStart = (groupKey: string, nextStart: string) => {
    const group = groupsRef.current.find((item) => item.key === groupKey);
    const departure = group?.compactTransitPair ? group.members[0] : null;
    if (!group || !departure) return;

    updateLocation(activeDayRef.current, {
      ...departure,
      time: nextStart,
      endTime: undefined,
    });
  };

  const selectMember = (locationId: string) => {
    setSelectedLocation({ day: activeDay, locationId });
  };

  const selectGroup = (group: TimetableGroup) => {
    const activeMemberId =
      selectedLocation?.day === activeDay && group.members.some((member) => member.id === selectedLocation.locationId)
        ? selectedLocation.locationId
        : group.members[0]?.id;

    if (activeMemberId) {
      setSelectedLocation({ day: activeDay, locationId: activeMemberId });
    }
  };

  const startEdit = (locationId: string) => {
    const member = activitiesRef.current.find((activity) => activity.id === locationId);
    if (!member) return;

    selectMember(member.id);
    setEditingId(member.id);
    setEditForm({
      name: member.name,
      time: member.time,
      category: member.category,
      transitRole: member.transitRole,
      endTime: member.endTime,
    });
  };

  const swapGroupSchedules = (currentGroupKey: string, targetGroupKey: string) => {
    const currentIndex = getGroupIndexByKey(currentGroupKey);
    const targetIndex = getGroupIndexByKey(targetGroupKey);
    const current = groupsRef.current[currentIndex];
    const target = groupsRef.current[targetIndex];
    const lastIndex = groupsRef.current.length - 1;
    if (!current || !target) return;

    setGroupSchedule(current.key, target.time, targetIndex === lastIndex ? current.endTime : undefined);
    setGroupSchedule(target.key, current.time, currentIndex === lastIndex ? target.endTime : undefined);
    selectGroup(current);
  };

  const clearReorderSession = () => {
    if (reorderHoldTimerRef.current) {
      window.clearTimeout(reorderHoldTimerRef.current);
      reorderHoldTimerRef.current = null;
    }
    reorderSessionRef.current = null;
    setDraggingBar(null);
  };

  const startReorderDrag = (e: React.PointerEvent<HTMLDivElement>, group: TimetableGroup) => {
    if (editingId || draggingHandle) return;

    selectGroup(group);

    const pointerId = e.pointerId;
    const startY = e.clientY;

    reorderSessionRef.current = {
      pointerId,
      groupKey: group.key,
      startY,
      appliedSteps: 0,
      activated: false,
    };

    reorderHoldTimerRef.current = window.setTimeout(() => {
      if (!reorderSessionRef.current || reorderSessionRef.current.pointerId !== pointerId) return;
      reorderSessionRef.current.activated = true;
      setDraggingBar({ groupKey: group.key, offsetY: 0 });
    }, HOLD_TO_REORDER_MS);

    e.currentTarget.setPointerCapture(pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const session = reorderSessionRef.current;
      if (!session || session.pointerId !== pointerId) return;

      const deltaY = moveEvent.clientY - session.startY;
      if (!session.activated) return;

      const desiredSteps = Math.round(deltaY / ROW_STRIDE_PX);

      while (session.appliedSteps < desiredSteps) {
        const currentIndex = getGroupIndexByKey(session.groupKey);
        if (currentIndex === -1 || currentIndex >= groupsRef.current.length - 1) break;
        const nextGroup = groupsRef.current[currentIndex + 1];
        if (!nextGroup) break;
        swapGroupSchedules(session.groupKey, nextGroup.key);
        session.appliedSteps += 1;
      }

      while (session.appliedSteps > desiredSteps) {
        const currentIndex = getGroupIndexByKey(session.groupKey);
        if (currentIndex <= 0) break;
        const prevGroup = groupsRef.current[currentIndex - 1];
        if (!prevGroup) break;
        swapGroupSchedules(session.groupKey, prevGroup.key);
        session.appliedSteps -= 1;
      }

      setDraggingBar({
        groupKey: session.groupKey,
        offsetY: deltaY - session.appliedSteps * ROW_STRIDE_PX,
      });
    };

    const onEnd = () => {
      clearReorderSession();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  const adjustGroupStart = (groupKey: string, deltaMinutes: number) => {
    const currentIndex = getGroupIndexByKey(groupKey);
    const group = groupsRef.current[currentIndex];
    if (!group) return;

    const previousStart = currentIndex > 0 ? groupsRef.current[currentIndex - 1].startMin : 0;
    const latestStart = group.endMin - TIME_STEP_MINUTES;
    const nextStart = Math.max(
      previousStart + TIME_STEP_MINUTES,
      Math.min(latestStart, group.startMin + deltaMinutes)
    );

    if (nextStart === group.startMin) return;

    if (group.compactTransitPair) {
      setTransitPairStart(group.key, minToTime(nextStart));
      return;
    }

    setGroupSchedule(group.key, minToTime(nextStart), currentIndex === groupsRef.current.length - 1 ? group.endTime : undefined);
  };

  const adjustGroupEnd = (groupKey: string, deltaMinutes: number) => {
    const currentIndex = getGroupIndexByKey(groupKey);
    const group = groupsRef.current[currentIndex];
    if (!group) return;

    const nextGroup = groupsRef.current[currentIndex + 1];
    if (!nextGroup) {
      const earliestEnd = group.startMin + TIME_STEP_MINUTES;
      const nextEnd = Math.max(
        earliestEnd,
        Math.min(DAY_END_MINUTES, group.endMin + deltaMinutes)
      );

      if (nextEnd === group.endMin) return;

      if (group.compactTransitPair) {
        setTransitPairEnd(group.key, minToTime(nextEnd));
        return;
      }

      setGroupSchedule(group.key, group.time, minToTime(nextEnd));
      return;
    }

    if (group.compactTransitPair) {
      const earliestEnd = group.startMin + TIME_STEP_MINUTES;
      const latestEnd = Math.max(earliestEnd, nextGroup.startMin - TIME_STEP_MINUTES);
      const nextEnd = Math.max(
        earliestEnd,
        Math.min(latestEnd, group.endMin + deltaMinutes)
      );
      if (nextEnd === group.endMin) return;
      setTransitPairEnd(group.key, minToTime(nextEnd));
      return;
    }

    const nextNextStart = groupsRef.current[currentIndex + 2]?.startMin ?? DAY_END_MINUTES;
    const earliestNextStart = group.startMin + TIME_STEP_MINUTES;
    const latestNextStart = Math.max(earliestNextStart, nextNextStart - TIME_STEP_MINUTES);
    const nextStart = Math.max(
      earliestNextStart,
      Math.min(latestNextStart, nextGroup.startMin + deltaMinutes)
    );

    if (nextStart === nextGroup.startMin) return;

    setGroupSchedule(
      nextGroup.key,
      minToTime(nextStart),
      currentIndex + 1 === groupsRef.current.length - 1 ? nextGroup.endTime : undefined
    );
  };

  const startResizeDrag = (
    e: React.PointerEvent<HTMLButtonElement>,
    group: TimetableGroup,
    side: ResizeHandleSide
  ) => {
    const track = e.currentTarget.parentElement?.parentElement;
    if (!track) return;

    e.preventDefault();
    e.stopPropagation();
    selectGroup(group);
    setDraggingHandle({ groupKey: group.key, side });

    const pointerId = e.pointerId;
    const startX = e.clientX;
    const trackWidth = track.getBoundingClientRect().width;
    let appliedStep = 0;

    e.currentTarget.setPointerCapture(pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const minutesFromDrag = (deltaX / trackWidth) * totalMinRef.current;
      const nextStep = Math.trunc(minutesFromDrag / TIME_STEP_MINUTES);
      const deltaStep = nextStep - appliedStep;

      if (deltaStep === 0) return;

      const deltaMinutes = deltaStep * TIME_STEP_MINUTES;
      if (side === "start") {
        adjustGroupStart(group.key, deltaMinutes);
      } else {
        adjustGroupEnd(group.key, deltaMinutes);
      }

      appliedStep = nextStep;
    };

    const onEnd = () => {
      setDraggingHandle(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  const mergeGroups = (sourceId: string, targetId: string, placement: DropPlacement) => {
    const sourceGroup = getGroupByLocationId(sourceId);
    const targetGroup = getGroupByLocationId(targetId);
    if (!sourceGroup || !targetGroup || sourceGroup.key === targetGroup.key) return;

    const sourceMember = sourceGroup.members.find((member) => member.id === sourceId);
    const targetMember = targetGroup.members.find((member) => member.id === targetId);
    if (!sourceMember || !targetMember) return;

    const sourceWasGrouped = sourceGroup.members.length > 1 && !sourceGroup.virtualGroup;
    const targetWasGrouped = targetGroup.members.length > 1 && !targetGroup.virtualGroup;
    const targetIsLast = targetGroup.index === groupsRef.current.length - 1;
    const nextGroupId =
      sourceWasGrouped && !targetWasGrouped
        ? createGroupId()
        : targetMember.groupId ?? createGroupId();

    if (sourceWasGrouped) {
      const remainingCount = sourceGroup.members.length - 1;
      sourceGroup.members.forEach((member) => {
        if (member.id === sourceId) return;
        updateLocation(activeDayRef.current, {
          ...member,
          groupId: remainingCount === 1 ? undefined : sourceGroup.key,
          endTime: sourceGroup.endTime,
        });
      });
    }

    if (!targetWasGrouped) {
      updateLocation(activeDayRef.current, {
        ...targetMember,
        time: targetGroup.time,
        endTime: targetIsLast ? targetGroup.endTime : undefined,
        groupId: nextGroupId,
      });
    }

    updateLocation(activeDayRef.current, {
      ...sourceMember,
      time: targetGroup.time,
      endTime: targetIsLast ? targetGroup.endTime : undefined,
      groupId: nextGroupId,
    });

    const orderedIds = locations.map((location) => location.id);
    reorderLocations(moveIdRelative(orderedIds, sourceId, targetId, placement));

    setDraggedLabelId(null);
    setDropTargetId(null);
    setDropPlacement("after");
    selectMember(sourceId);
  };

  const reorderWithinGroup = (sourceId: string, targetId: string, placement: DropPlacement) => {
    const sourceGroup = getGroupByLocationId(sourceId);
    const targetGroup = getGroupByLocationId(targetId);
    if (!sourceGroup || !targetGroup || sourceGroup.key !== targetGroup.key) return;

    const orderedIds = locations.map((location) => location.id);
    reorderLocations(moveIdRelative(orderedIds, sourceId, targetId, placement));

    setDraggedLabelId(null);
    setDropTargetId(null);
    setDropPlacement("after");
    selectMember(sourceId);
  };

  const ungroupMembers = (locationId: string) => {
    const group = getGroupByLocationId(locationId);
    if (!group || group.members.length <= 1 || group.virtualGroup) return;

    const isLastGroup = group.index === groupsRef.current.length - 1;
    group.members.forEach((member, memberIndex) => {
      updateLocation(activeDayRef.current, {
        ...member,
        groupId: undefined,
        endTime: isLastGroup && memberIndex === group.members.length - 1 ? group.endTime : undefined,
      });
    });

    selectMember(locationId);
  };

  const detachMemberFromGroup = (locationId: string, placement: DropPlacement = dropPlacement) => {
    const group = getGroupByLocationId(locationId);
    if (!group || group.members.length <= 1 || group.virtualGroup) return;

    const remainingCount = group.members.length - 1;
    const groupDuration = group.endMin - group.startMin;
    const detachedShare = Math.max(
      TIME_STEP_MINUTES,
      snapToStep(groupDuration / group.members.length)
    );
    const detachedDuration = Math.min(
      groupDuration - TIME_STEP_MINUTES,
      detachedShare
    );
    const detachedStart =
      placement === "before" ? group.startMin : group.endMin - detachedDuration;
    const detachedEnd = detachedStart + detachedDuration;
    const remainingStart =
      placement === "before" ? detachedEnd : group.startMin;
    const remainingEnd =
      placement === "before" ? group.endMin : detachedStart;
    const isLastGroup = group.index === groupsRef.current.length - 1;

    group.members.forEach((member) => {
      if (member.id === locationId) {
        updateLocation(activeDayRef.current, {
          ...member,
          time: minToTime(detachedStart),
          groupId: undefined,
          endTime: isLastGroup && placement === "after" ? minToTime(detachedEnd) : undefined,
        });
        return;
      }

      updateLocation(activeDayRef.current, {
        ...member,
        time: minToTime(remainingStart),
        groupId: remainingCount === 1 ? undefined : group.key,
        endTime: isLastGroup ? minToTime(remainingEnd) : undefined,
      });
    });

    const anchorId =
      group.members.find((member) => member.id !== locationId)?.id ?? locationId;
    const orderedIds = locations.map((location) => location.id);
    reorderLocations(moveIdRelative(orderedIds, locationId, anchorId, placement));

    setDraggedLabelId(null);
    setDropTargetId(null);
    setDropPlacement("after");
    selectMember(locationId);
  };

  const handleLabelDrop = (targetId: string) => {
    if (!draggedLabelId || draggedLabelId === targetId) return;
    const sourceGroup = getGroupByLocationId(draggedLabelId);
    const targetGroup = getGroupByLocationId(targetId);
    if (sourceGroup && targetGroup && sourceGroup.key === targetGroup.key) {
      dragOutcomeRef.current = "reorder";
      reorderWithinGroup(draggedLabelId, targetId, dropPlacement);
      return;
    }
    dragOutcomeRef.current = "merge";
    mergeGroups(draggedLabelId, targetId, dropPlacement);
  };

  const commitEdit = () => {
    if (!editingId) return;

    const group = getGroupByLocationId(editingId);
    const startMinute = timeToMin(editForm.time);
    const normalizedEndTime = editForm.endTime
      ? minToTime(
          Math.max(
            startMinute + TIME_STEP_MINUTES,
            Math.min(DAY_END_MINUTES, timeToMin(editForm.endTime))
          )
        )
      : undefined;
    const normalizedTransitRole =
      editForm.category === "TRANSIT" ? (editForm.transitRole ?? "DEPARTURE") : undefined;

    if (group && group.members.length > 1) {
      const isCompactPair = Boolean(group.compactTransitPair);
      const editingMember = group.members.find((m) => m.id === editingId);
      const partner =
        isCompactPair && editForm.category === "TRANSIT"
          ? group.members.find((m) => m.id !== editingId)
          : undefined;
      const partnerNeedsFlip =
        partner !== undefined &&
        editingMember !== undefined &&
        normalizedTransitRole !== undefined &&
        partner.transitRole === normalizedTransitRole;

      if (partnerNeedsFlip && partner && editingMember) {
        // Role swap in a compact transit pair: also swap times so the
        // role-ordered cards (DEPARTURE left, ARRIVAL right) stay aligned
        // with the time-ordered bar edges. Without this, the right resize
        // handle would move the visually-left card and vice versa.
        const partnerNewRole: TransitRole =
          normalizedTransitRole === "DEPARTURE" ? "ARRIVAL" : "DEPARTURE";
        updateLocation(activeDay, {
          ...editingMember,
          name: editForm.name,
          category: editForm.category,
          transitRole: normalizedTransitRole,
          time: partner.time,
          endTime: partner.endTime,
        });
        updateLocation(activeDay, {
          ...partner,
          transitRole: partnerNewRole,
          time: editingMember.time,
          endTime: editingMember.endTime,
        });
      } else {
        // Compact transit pairs hold independent times per member, so do NOT
        // propagate the edited time/endTime to the partner outside the swap.
        group.members.forEach((member) => {
          const isEditing = member.id === editingId;
          updateLocation(activeDay, {
            ...member,
            name: isEditing ? editForm.name : member.name,
            category: isEditing ? editForm.category : member.category,
            transitRole: isEditing ? normalizedTransitRole : member.transitRole,
            time: isCompactPair && !isEditing ? member.time : editForm.time,
            endTime: isCompactPair && !isEditing ? member.endTime : normalizedEndTime,
          });
        });
      }
    } else {
      updateLocation(activeDay, {
        id: editingId,
        ...editForm,
        transitRole: normalizedTransitRole,
        endTime: normalizedEndTime,
      });
    }

    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`timetable-${activeDay}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2 border-b border-border-dim/60 bg-black/20 px-4 py-2.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="text-[13px] font-mono tracking-widest">GANTT</span>
          </button>
          <div className="mx-1 h-3 w-px bg-slate-700" />
          <span className={cn("text-[13px] font-mono font-bold", cityStyle.text)}>
            Day {String(activeDay).padStart(2, "0")}
          </span>
          <span className="text-[13px] font-mono text-slate-500">
            · {dayData.label} · {dayData.city} · {dayData.note}
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            <button
              onClick={() => setActiveDay(Math.max(1, activeDay - 1))}
              disabled={activeDay === 1}
              className="p-1 text-slate-500 transition-colors hover:text-white disabled:opacity-20"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              onClick={() => setActiveDay(Math.min(days.length, activeDay + 1))}
              disabled={activeDay === days.length}
              className="p-1 text-slate-500 transition-colors hover:text-white disabled:opacity-20"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="select-none px-4 py-3">
          <div className="relative mb-2 ml-64 h-4">
            {hours.map((minute) => (
              <div
                key={minute}
                className="absolute top-0"
                style={{
                  left: `${pct(minute)}%`,
                  transform: minute === endMin ? "translateX(-100%)" : "translateX(0)",
                }}
              >
                <span className="text-[12px] font-mono tracking-wider text-slate-600">
                  {String(minute / 60).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          <div className="relative flex flex-col gap-1.5 min-h-[80px]">
            <div className="pointer-events-none absolute inset-0 ml-64">
              {hours.map((minute) => (
                <div
                  key={minute}
                  className="absolute top-0 bottom-0 border-l border-slate-800/60"
                  style={{ left: `${pct(minute)}%` }}
                />
              ))}
            </div>

            {bookmarkDragActive && (
              <div
                className="absolute inset-0 ml-64 z-40 rounded-sm ring-1 ring-amber-400/40 bg-amber-400/[0.04]"
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(BOOKMARK_DRAG_MIME)) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                  const fraction = rect.width > 0 ? x / rect.width : 0;
                  const raw = startMin + fraction * totalMin;
                  const snapped = Math.round(raw / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
                  setBookmarkDropMin(Math.max(0, Math.min(DAY_END_MINUTES, snapped)));
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setBookmarkDropMin(null);
                }}
                onDrop={(e) => {
                  if (!e.dataTransfer.types.includes(BOOKMARK_DRAG_MIME)) return;
                  e.preventDefault();
                  const placeId = e.dataTransfer.getData(BOOKMARK_DRAG_MIME);
                  const bm = bookmarks.find((b) => b.placeId === placeId);
                  if (!bm || bookmarkDropMin === null) return;
                  const category = bookmarkTypeToCategory(bm.type);
                  addLocation(activeDay, {
                    id: `bm-${bm.placeId.slice(-6)}-${Date.now().toString(36)}`,
                    name: bm.name,
                    category,
                    transitRole: roleForCategory(category, locations),
                    time: minToTime(bookmarkDropMin),
                    position: bm.position,
                  });
                  setBookmarkDropMin(null);
                  setBookmarkDragActive(false);
                }}
              >
                {bookmarkDropMin !== null && (
                  <>
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 w-px bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                      style={{ left: `${pct(bookmarkDropMin)}%` }}
                    />
                    <div
                      className="pointer-events-none absolute -top-5 -translate-x-1/2 px-1.5 py-0.5 bg-amber-400 text-black text-[10px] font-mono rounded-sm whitespace-nowrap font-bold"
                      style={{ left: `${pct(bookmarkDropMin)}%` }}
                    >
                      {minToTime(bookmarkDropMin)}
                    </div>
                  </>
                )}
              </div>
            )}

            {groups.map((group) => {
              const leader = group.members[0];
              const barLeft = pct(group.startMin);
              const barWidth = pct(group.endMin) - barLeft;
              const durationMinutes = group.endMin - group.startMin;
              const editTarget = selectedLocation?.day === activeDay
                ? group.members.find((member) => member.id === selectedLocation.locationId) ?? leader
                : leader;
              const isEditing = editingId !== null && group.members.some((member) => member.id === editingId);
              const isGroupSelected =
                selectedLocation?.day === activeDay && group.members.some((member) => member.id === selectedLocation.locationId);
              const isDraggingBar = draggingBar?.groupKey === group.key;
              const dragOffsetY = isDraggingBar ? draggingBar.offsetY : 0;
              const compactTransitPair = Boolean(group.compactTransitPair);
              const isGrouped = group.members.length > 1 && !compactTransitPair;
              const memberGapPx = isGrouped ? GROUP_MEMBER_GAP_PX : ROW_GAP_PX;
              const membersHeight = compactTransitPair
                ? ROW_HEIGHT_PX
                : group.members.length * ROW_HEIGHT_PX + (group.members.length - 1) * memberGapPx;
              const groupHeight = isGrouped
                ? GROUP_HEADER_HEIGHT_PX + ROW_GAP_PX + membersHeight
                : membersHeight;
              const groupBadge = isGrouped ? `SHARED ${group.members.length}` : null;
              const transitOrdered = compactTransitPair ? transitPairOrdered(group.members) : null;
              const departureMember = transitOrdered ? transitOrdered[0] : null;
              const arrivalMember = transitOrdered ? transitOrdered[1] : null;
              const renderMembers = transitOrdered ?? group.members;

              return (
                <motion.div
                  key={group.key}
                  layout
                  transition={{ layout: { duration: 0.18, ease: "easeInOut" } }}
                  className="flex items-stretch"
                  style={{ minHeight: `${groupHeight}px` }}
                >
                  <div className="w-64 flex-shrink-0 pr-3" style={{ minHeight: `${groupHeight}px` }}>
                    <div
                      ref={(node) => {
                        if (node) {
                          groupCardRefs.current.set(group.key, node);
                        } else {
                          groupCardRefs.current.delete(group.key);
                        }
                      }}
                      className={cn(
                        "flex h-full flex-col",
                        isGrouped
                          ? "rounded-xl border border-white/10 bg-white/[0.03] p-2 shadow-[0_6px_24px_rgba(2,6,23,0.18)]"
                          : ""
                      )}
                    >
                      {isGrouped && (
                        <div className="mb-1.5 flex h-6 items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span className="rounded-full border border-cyan-400/35 bg-cyan-400/10 px-2 py-[2px] text-[10px] font-mono text-cyan-200 flex-shrink-0">
                              {groupBadge}
                            </span>
                            <input
                              value={itineraryDay.groupNames?.[group.key] ?? ""}
                              onChange={(e) => setGroupName(activeDay, group.key, e.target.value)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFocusGroupTarget({ day: activeDay, groupId: group.key });
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              placeholder="그룹 이름"
                              className="min-w-0 flex-1 bg-transparent border-0 outline-none text-[12px] font-mono text-slate-200 placeholder:text-slate-600"
                            />
                          </div>
                          {isGroupSelected && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                ungroupMembers(editTarget.id);
                              }}
                              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-mono text-slate-300 transition hover:border-red-400/40 hover:text-white flex-shrink-0"
                            >
                              UNGROUP
                            </button>
                          )}
                        </div>
                      )}

                      <div
                        className={cn("flex-1", compactTransitPair ? "grid grid-cols-2 gap-1" : "flex flex-col")}
                        style={compactTransitPair ? undefined : { gap: `${memberGapPx}px` }}
                      >
                        {renderMembers.map((member) => {
                        const CatIcon = CATEGORY_ICON[member.category];
                        const isMemberSelected =
                          selectedLocation?.day === activeDay && selectedLocation.locationId === member.id;
                        const isDropTarget =
                          dropTargetId === member.id && draggedLabelId !== null && draggedLabelId !== member.id;
                        const routeKey = `${activeDay}:${member.id}`;
                        const canRouteMember = Boolean(member.position || member.entryPoint || member.exitPoint);
                        const isRouteSelected = routeSelectedLocationKeys.includes(routeKey);

                        return (
                          <div
                            key={member.id}
                            draggable={!isEditing}
                            onClick={() => selectMember(member.id)}
                            onDragStart={() => {
                              setDraggedLabelId(member.id);
                              setDropTargetId(null);
                              dragOriginGroupKeyRef.current = group.key;
                              dragOutcomeRef.current = null;
                              selectMember(member.id);
                            }}
	                            onDragOver={(e) => {
	                              if (!draggedLabelId || draggedLabelId === member.id) return;
	                              const sourceGroup = getGroupByLocationId(draggedLabelId);
	                              const targetGroup = getGroupByLocationId(member.id);
	                              if (!sourceGroup || !targetGroup) return;
	                              const rect = e.currentTarget.getBoundingClientRect();
	                              setDropPlacement(e.clientY < rect.top + rect.height / 2 ? "before" : "after");
	                              e.preventDefault();
                              setDropTargetId(member.id);
                            }}
                            onDragLeave={() => {
                              if (dropTargetId === member.id) setDropTargetId(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleLabelDrop(member.id);
                            }}
                            onDragEnd={(e) => {
                              const originGroupKey = dragOriginGroupKeyRef.current;
                              const originGroup = originGroupKey
                                ? groupByLocationId.get(member.id)?.key === originGroupKey
                                  ? getGroupByLocationId(member.id)
                                  : groups.find((item) => item.key === originGroupKey)
                                : null;
                              const originCard = originGroupKey ? groupCardRefs.current.get(originGroupKey) : null;
                              const rect = originCard?.getBoundingClientRect();
                              const droppedOutsideOrigin =
                                rect !== undefined &&
                                (e.clientX < rect.left ||
                                  e.clientX > rect.right ||
                                  e.clientY < rect.top ||
                                  e.clientY > rect.bottom);
                              const outsidePlacement =
                                rect && e.clientY < rect.top + rect.height / 2 ? "before" : "after";

                              if (
                                dragOutcomeRef.current === null &&
                                originGroup &&
                                originGroup.members.length > 1 &&
                                !originGroup.virtualGroup &&
                                droppedOutsideOrigin
                              ) {
                                detachMemberFromGroup(member.id, outsidePlacement);
                              }

                              setDraggedLabelId(null);
                              setDropTargetId(null);
                              setDropPlacement("after");
                              dragOriginGroupKeyRef.current = null;
                              dragOutcomeRef.current = null;
                            }}
                            className={cn(
                              "group/label flex h-9 items-center gap-1.5 rounded-md border px-2 transition-all",
                              "cursor-grab border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]",
                              compactTransitPair ? "min-w-0 w-full gap-1 px-1.5" : "",
                              isGrouped ? "bg-black/20" : "",
                              isMemberSelected ? "border-white/15 bg-white/[0.06]" : "",
                              isDropTarget && dropPlacement === "before"
                                ? "border-blue-400/60 bg-blue-500/10 shadow-[inset_0_2px_0_rgba(96,165,250,0.9)]"
                                : "",
                              isDropTarget && dropPlacement === "after"
                                ? "border-blue-400/60 bg-blue-500/10 shadow-[inset_0_-2px_0_rgba(96,165,250,0.9)]"
                                : "",
                              draggedLabelId === member.id ? "opacity-60" : ""
                            )}
                          >
                            <GripVertical
                              className={cn(
                                "flex-shrink-0 text-slate-500 transition group-hover/label:text-blue-300/80",
                                compactTransitPair ? "h-3 w-3" : "h-3.5 w-3.5"
                              )}
                            />
                            {compactTransitPair && (
                              <span className="w-8 flex-shrink-0 text-[10px] font-mono font-bold text-cyan-100">
                                {member.time}
                              </span>
                            )}
                            <button
                              type="button"
                              disabled={!canRouteMember}
                              draggable={false}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRouteLocationSelection(activeDay, member.id);
                              }}
                              title={canRouteMember ? "동선 계산 대상" : "좌표가 없어 동선을 계산할 수 없음"}
                              className={cn(
                                "inline-flex flex-shrink-0 items-center justify-center rounded-sm border transition",
                                compactTransitPair ? "h-4 w-4" : "h-5 w-5",
                                isRouteSelected
                                  ? "border-blue-300 bg-blue-400/20 text-blue-200 shadow-[0_0_8px_rgba(96,165,250,0.35)]"
                                  : "border-slate-700 bg-black/30 text-slate-600 hover:border-blue-400/50 hover:text-blue-300",
                                !canRouteMember && "cursor-not-allowed opacity-25 hover:border-slate-700 hover:text-slate-600"
                              )}
                            >
                              <Route className={cn(compactTransitPair ? "h-2.5 w-2.5" : "h-3 w-3")} />
                            </button>
                            <div className={cn("rounded-sm bg-white/5 p-0.5 flex-shrink-0", CATEGORY_COLOR[member.category])}>
                              <CatIcon className={cn(compactTransitPair ? "h-2 w-2" : "h-2.5 w-2.5")} />
                            </div>
                            <span className={cn(
                              "min-w-0 flex-1 truncate font-semibold leading-tight text-slate-200",
                              compactTransitPair ? "text-[12px]" : "text-[13px]"
                            )}>
                              {member.name}
                            </span>
                            {member.category === "TRANSIT" && member.transitRole && (
                              <span className="rounded-sm border border-cyan-300/20 bg-cyan-400/10 px-1 py-[1px] text-[9px] font-bold text-cyan-200">
                                {member.transitRole === "DEPARTURE" ? "출발" : "도착"}
                              </span>
                            )}
                            {isMemberSelected && (
                              <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-[2px] text-[10px] font-mono text-slate-400">
                                {isGrouped ? "IN GROUP" : "READY"}
                              </span>
                            )}
                            <button
                              draggable={false}
                              onPointerDown={(e) => e.stopPropagation()}
                              onDragStart={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeLocation(activeDay, member.id);
                              }}
                              title="삭제"
                              className="flex-shrink-0 opacity-0 group-hover/label:opacity-100 text-slate-500 hover:text-red-400 transition"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    </div>
                  </div>

                  <div className="relative flex-1" style={{ minHeight: `${groupHeight}px` }}>
                    <AnimatePresence initial={false} mode="wait">
                      {isEditing ? (
                        <motion.div
                          key={`edit-${group.key}`}
                          initial={{
                            left: `${barLeft}%`,
                            width: `${barWidth}%`,
                            opacity: 0.65,
                            scaleY: 0.92,
                          }}
                          animate={{
                            left: "0%",
                            width: "100%",
                            opacity: 1,
                            scaleY: 1,
                          }}
                          exit={{
                            left: `${barLeft}%`,
                            width: `${barWidth}%`,
                            opacity: 0.65,
                            scaleY: 0.92,
                          }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="absolute inset-y-0 z-20 flex items-center gap-1 rounded-sm border border-slate-600/60 bg-slate-900/95 px-1.5"
                        >
                          <select
                            value={editForm.category}
                            onChange={(e) =>
                              setEditForm((current) => ({
                                ...current,
                                category: e.target.value as LocationCategory,
                                transitRole:
                                  e.target.value === "TRANSIT"
                                    ? (current.transitRole ?? roleForCategory("TRANSIT", locations))
                                    : undefined,
                              }))
                            }
                            className="cursor-pointer border-0 bg-transparent text-[12px] font-mono text-slate-300 outline-none"
                          >
                            {CATEGORY_OPTIONS.map((category) => (
                              <option key={category} value={category} className="bg-slate-900">
                                {category}
                              </option>
                            ))}
                          </select>
                          {editForm.category === "TRANSIT" && (
                            <select
                              value={editForm.transitRole ?? "DEPARTURE"}
                              onChange={(e) =>
                                setEditForm((current) => ({
                                  ...current,
                                  transitRole: e.target.value as TransitRole,
                                }))
                              }
                              className="cursor-pointer border border-cyan-300/20 bg-cyan-400/10 px-1 py-0.5 text-[11px] font-bold text-cyan-100 outline-none"
                            >
                              <option value="DEPARTURE" className="bg-slate-900">출발</option>
                              <option value="ARRIVAL" className="bg-slate-900">도착</option>
                            </select>
                          )}
                          <ThemedTimePicker
                            value={editForm.time}
                            onChange={(time) =>
                              setEditForm((current) => ({ ...current, time }))
                            }
                          />
                          <input
                            ref={nameRef}
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((current) => ({ ...current, name: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-white outline-none"
                            placeholder="장소명"
                          />
                          <button
                            onClick={commitEdit}
                            className="flex-shrink-0 text-emerald-400 hover:text-emerald-300"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-shrink-0 text-slate-500 hover:text-slate-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              removeLocation(activeDay, editTarget.id);
                              cancelEdit();
                            }}
                            className="flex-shrink-0 text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={`bar-${group.key}`}
                          initial={false}
                          animate={{ scaleX: 1, opacity: 1, y: dragOffsetY }}
                          exit={{ scaleX: 0.96, opacity: 0.7 }}
                          transition={
                            isDraggingBar
                              ? {
                                  y: { duration: 0 },
                                  scaleX: { duration: 0.2, ease: "easeInOut" },
                                  opacity: { duration: 0.2, ease: "easeInOut" },
                                }
                              : { duration: 0.2, ease: "easeInOut" }
                          }
                          style={{
                            position: "absolute",
                            left: `${barLeft}%`,
                            width: `${barWidth}%`,
                            minWidth: compactTransitPair ? 120 : undefined,
                            top: "3px",
                            bottom: "3px",
                            originX: 0,
                          }}
                          onPointerDown={(e) => startReorderDrag(e, group)}
                          onClick={() => selectGroup(group)}
                          className={cn(
                            "origin-left overflow-visible rounded-2xl ring-1 ring-transparent transition-all",
                            "group/bar flex items-center px-2 pr-8",
                            isDraggingBar ? "z-30 cursor-grabbing shadow-[0_8px_24px_rgba(15,23,42,0.45)]" : "cursor-grab",
                            isGroupSelected ? "ring-white/60" : "",
                            CATEGORY_BAR[group.primaryCategory],
                            CATEGORY_GLOW[group.primaryCategory]
                          )}
                        >
                          <span className="flex-1 truncate whitespace-nowrap text-[12px] font-mono text-white/80">
                            {compactTransitPair && departureMember && arrivalMember
                              ? `${departureMember.time} ${departureMember.name} → ${arrivalMember.time} ${arrivalMember.name}`
                              : `${group.time} · ${durationMinutes}분${group.members.length > 1 ? ` · ${group.members.length}개` : ""}`}
                          </span>
                          {isGroupSelected && (
                            <>
                              <button
                                onPointerDown={(e) => startResizeDrag(e, group, "start")}
                                className={cn(
                                  "absolute -left-1 top-1/2 w-3 h-[85%] min-h-[28px] -translate-y-1/2 rounded-full border border-white/20 bg-black/70 shadow-[0_0_8px_rgba(0,0,0,0.45)] transition",
                                  "cursor-ew-resize",
                                  draggingHandle?.groupKey === group.key && draggingHandle.side === "start"
                                    ? "border-blue-400 bg-blue-500/40"
                                    : "hover:border-blue-400/70"
                                )}
                                title="꾹 눌러 시작 시간 조절"
                              />
                              <button
                                onPointerDown={(e) => startResizeDrag(e, group, "end")}
                                className={cn(
                                  "absolute -right-1 top-1/2 w-3 h-[85%] min-h-[28px] -translate-y-1/2 rounded-full border border-white/20 bg-black/70 shadow-[0_0_8px_rgba(0,0,0,0.45)] transition",
                                  "cursor-ew-resize",
                                  draggingHandle?.groupKey === group.key && draggingHandle.side === "end"
                                    ? "border-blue-400 bg-blue-500/40"
                                    : "hover:border-blue-400/70"
                                )}
                                title="꾹 눌러 종료 시간 조절"
                              />
                            </>
                          )}
                          <Pencil
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(editTarget.id);
                            }}
                            className={cn(
                              "absolute right-1 top-1/2 h-5 w-5 -translate-y-1/2 rounded-sm border p-[4px]",
                              "flex-shrink-0 border-blue-400/50 bg-blue-500/20 text-blue-100 transition-all duration-150",
                              "shadow-[0_0_10px_rgba(59,130,246,0.35)]",
                              "opacity-100 group-hover/bar:border-blue-300 group-hover/bar:bg-blue-400/30 group-hover/bar:text-white"
                            )}
                          />
                          {isGroupSelected && (
                            <Trash2
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeLocation(activeDay, editTarget.id);
                              }}
                              className={cn(
                                "absolute right-7 top-1/2 h-5 w-5 -translate-y-1/2 rounded-sm border p-[4px]",
                                "flex-shrink-0 border-red-400/50 bg-red-500/20 text-red-100 transition-all duration-150",
                                "shadow-[0_0_10px_rgba(239,68,68,0.35)]",
                                "cursor-pointer hover:border-red-300 hover:bg-red-400/30 hover:text-white"
                              )}
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-3 border-t border-border-dim/40 pt-2.5">
            {CATEGORY_OPTIONS.map((category) => (
              <div key={category} className="flex items-center gap-1">
                <div className={cn("h-2 w-2 flex-shrink-0 rounded-full", CATEGORY_BAR[category])} />
                <span className={cn("text-[12px] font-mono", CATEGORY_COLOR[category])}>{category}</span>
              </div>
            ))}
            <button
              onClick={computeSelectedRoutes}
              disabled={selectedRouteCount === 0}
              title="체크한 일정의 동선을 계산"
              className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-sm border border-blue-400/30 bg-blue-400/10 px-2 text-[11px] font-mono text-blue-300 transition hover:border-blue-300 disabled:border-slate-700 disabled:bg-white/[0.03] disabled:text-slate-600"
            >
              <Route className="h-3.5 w-3.5" />
              동선 계산
              <span className="text-[10px] text-slate-500">{selectedRouteCount}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
