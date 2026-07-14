import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import {
  setLoading,
  setSuggestions,
  setError,
  clearSuggestions,
  selectSuggestions,
  selectSuggestionsStatus,
  selectSuggestionsError,
  selectLoadedForDate,
} from '@/store/slices/food-suggestions-slice';
import { fetchSuggestions } from '@/services/food-suggestions-service';
import { useOffline } from '@/hooks/use-offline';

function dateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

interface UseFoodSuggestionsProps {
  userId: string
  date: Date
  remainingCalories: number
  hasGoals: boolean
}

export function useFoodSuggestions({ userId, date, remainingCalories, hasGoals }: UseFoodSuggestionsProps) {
  const dispatch = useDispatch<AppDispatch>()
  const isOffline = useOffline()

  const suggestions  = useSelector(selectSuggestions)
  const status       = useSelector(selectSuggestionsStatus)
  const error        = useSelector(selectSuggestionsError)
  const loadedForDate = useSelector(selectLoadedForDate)

  const eligible = hasGoals && remainingCalories > 150 && isToday(date)
  const dateStr = dateString(date)

  const loadSuggestions = useCallback(async () => {
    if (!eligible) return
    if (status === 'success' && loadedForDate === dateStr) return

    if (isOffline) {
      dispatch(setError('No internet connection'))
      return
    }

    dispatch(setLoading())
    try {
      const result = await fetchSuggestions(userId, date)
      dispatch(setSuggestions({ suggestions: result, date: dateStr }))
    } catch (err) {
      dispatch(setError((err as Error).message ?? 'Failed to load suggestions'))
    }
  }, [eligible, status, loadedForDate, dateStr, isOffline, userId, date, dispatch])

  const refresh = useCallback(async (refreshPrompt: string) => {
    if (isOffline) {
      dispatch(setError('No internet connection'))
      return
    }

    dispatch(clearSuggestions())
    dispatch(setLoading())
    try {
      const result = await fetchSuggestions(userId, date, refreshPrompt)
      dispatch(setSuggestions({ suggestions: result, date: dateStr }))
    } catch (err) {
      dispatch(setError((err as Error).message ?? 'Failed to refresh suggestions'))
    }
  }, [isOffline, userId, date, dateStr, dispatch])

  return { suggestions, status, error, isOffline, eligible, loadSuggestions, refresh }
}
