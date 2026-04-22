import type { Guest } from '../types'

const NORMALIZE_REGEX = /[^a-z0-9а-яё\s-]/gi

export function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(NORMALIZE_REGEX, '')
    .replace(/\s+/g, ' ')
}

export function matchGuestByName(guests: Guest[], input: string): Guest | null {
  const normalizedInput = normalizeName(input)
  if (!normalizedInput) {
    return null
  }

  const exactMatch = guests.find(
    (guest) => normalizeName(guest.name) === normalizedInput,
  )
  if (exactMatch) {
    return exactMatch
  }

  return (
    guests.find((guest) => normalizeName(guest.name).includes(normalizedInput)) ??
    null
  )
}

export function isNameMatch(left: string, right: string): boolean {
  return normalizeName(left) === normalizeName(right)
}

export function pickTargetGuest(guests: Guest[], excludedGuestId: string): Guest | null {
  const availableTargets = guests.filter((guest) => guest.id !== excludedGuestId)
  if (availableTargets.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * availableTargets.length)
  return availableTargets[randomIndex]
}
