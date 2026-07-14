import { useEffect, useMemo, useRef, useState } from 'react';
import { usePowerSync } from '@powersync/react-native';
import { useSelector, useDispatch } from 'react-redux';
import { AddMealSlotModal } from '@/components/calendar/add-meal-slot-modal';
import { useMealPlan } from '@/hooks/use-meal-plan';
import { useFoodLog } from '@/hooks/use-food-log';
import { useCalendar } from '@/hooks/use-calendar';
import { getCachedUserId } from '@/services/supabase';
import { updateExternalEventId } from '@/services/meal-plan-service';
import type { Recipe } from '@/models/recipe';
import type { MealSlotFoodInput } from '@/services/meal-plan-service';
import type { LogFoodSubmitParams } from '@/components/calendar/log-food-form';
import {
  selectAddModalOpen,
  selectAddModalDate,
  selectAddModalTime,
  selectAddModalSuggestion,
  closeAddModal,
} from '@/store/slices/add-meal-slot-slice';
import type { AppDispatch } from '@/store';

function toWeekStart(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function GlobalAddMealModal() {
  const dispatch = useDispatch<AppDispatch>();
  const db = usePowerSync();

  const isOpen          = useSelector(selectAddModalOpen);
  const prefillDate     = useSelector(selectAddModalDate);
  const prefillTime     = useSelector(selectAddModalTime);
  const prefillSuggestion = useSelector(selectAddModalSuggestion);

  // The user can change the day within the modal, so the working date is local
  // state seeded from the redux prefill rather than read straight from it.
  const [pickedDate, setPickedDate] = useState(prefillDate);
  useEffect(() => {
    if (isOpen) setPickedDate(prefillDate);
  }, [isOpen, prefillDate]);

  const weekStart = useMemo(() => toWeekStart(pickedDate), [pickedDate]);
  const userId = getCachedUserId() ?? undefined;

  const { weekPlan, createSlot, addRecipeToSlot, addFoodToSlot } = useMealPlan(weekStart);
  const { createFoodLog } = useFoodLog(weekStart);
  const { connected, createMealEvent } = useCalendar();

  // weekPlan's live query may not yet reflect a slot created moments ago, so track the
  // date/time each newly-created slot was given here instead of re-reading it back from weekPlan.
  const createdSlotInfoRef = useRef<Map<string, { date: string; time: string }>>(new Map());

  const handleCreateSlot = async (label: string, slotDate: string, time: string, icon?: string | null) => {
    const daySlots = weekPlan?.slots.filter((s) => s.date === slotDate) ?? [];
    const slotId = await createSlot({
      label,
      date: slotDate,
      time,
      displayOrder: daySlots.length,
      icon,
    });
    if (slotId) createdSlotInfoRef.current.set(slotId, { date: slotDate, time });
    return slotId;
  };

  const handleAddRecipeToSlot = async (slotId: string, recipe: Recipe) => {
    await addRecipeToSlot(slotId, recipe.id);
    if (connected) {
      const slot = weekPlan?.slots.find((s) => s.id === slotId);
      const info = createdSlotInfoRef.current.get(slotId);
      const eventId = await createMealEvent({
        title: recipe.title,
        date: slot?.date ?? info?.date ?? pickedDate,
        timeOfDay: slot?.time_of_day ?? info?.time ?? null,
        slotId,
      });
      if (eventId) await updateExternalEventId(db, slotId, eventId);
    }
  };

  const handleAddFoodToSlot = async (slotId: string, food: MealSlotFoodInput) => {
    await addFoodToSlot(slotId, food);
  };

  const handleLogFood = async (date: string, params: LogFoodSubmitParams) => {
    await createFoodLog(date, params.label, params.timeOfDay, params.items, params.icon);
  };

  const handleClose = () => {
    dispatch(closeAddModal());
  };

  return (
    <AddMealSlotModal
      visible={isOpen}
      date={pickedDate}
      initialTime={prefillTime ?? undefined}
      userId={userId}
      prefillSuggestion={prefillSuggestion ?? undefined}
      onClose={handleClose}
      onDateChange={setPickedDate}
      onCreateSlot={handleCreateSlot}
      onAddRecipeToSlot={handleAddRecipeToSlot}
      onAddFoodToSlot={handleAddFoodToSlot}
      onLogFood={handleLogFood}
    />
  );
}
