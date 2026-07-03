import { useMemo } from 'react';
import { usePowerSync } from '@powersync/react-native';
import { useSelector, useDispatch } from 'react-redux';
import { AddMealSlotModal } from '@/components/calendar/add-meal-slot-modal';
import { useMealPlan } from '@/hooks/use-meal-plan';
import { useFoodLog } from '@/hooks/use-food-log';
import { useCalendar } from '@/hooks/use-calendar';
import { getCachedUserId } from '@/services/supabase';
import { updateExternalEventId } from '@/services/meal-plan-service';
import type { Recipe } from '@/models/recipe';
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

  const weekStart = useMemo(() => toWeekStart(prefillDate), [prefillDate]);
  const userId = getCachedUserId() ?? undefined;

  const { weekPlan, createSlot, addRecipeToSlot } = useMealPlan(weekStart);
  const { createFoodLog } = useFoodLog(weekStart);
  const { connected, createMealEvent } = useCalendar();

  const handleAdd = async (label: string, time?: string, recipe?: Recipe, icon?: string | null) => {
    const daySlots = weekPlan?.slots.filter((s) => s.date === prefillDate) ?? [];
    const slotId = await createSlot({
      label,
      date: prefillDate,
      time,
      displayOrder: daySlots.length,
      icon,
    });
    if (recipe && slotId) {
      await addRecipeToSlot(slotId, recipe.id);
      if (connected) {
        const eventId = await createMealEvent({
          title: recipe.title,
          date: prefillDate,
          timeOfDay: time || null,
          slotId,
        });
        if (eventId) await updateExternalEventId(db, slotId, eventId);
      }
    }
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
      date={prefillDate}
      initialTime={prefillTime ?? undefined}
      userId={userId}
      prefillSuggestion={prefillSuggestion ?? undefined}
      onClose={handleClose}
      onAdd={handleAdd}
      onLogFood={handleLogFood}
    />
  );
}
