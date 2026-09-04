import { Outlet, useLocation } from 'react-router-dom'
import { OnboardingPage } from '../pages/OnboardingPage'
import { usePermissions } from '../hooks/usePermissions'

const OPEN_WHILE_ONBOARDING = new Set(['/help', '/inquiries'])

export function OnboardingGate() {
  const { needsEditionOnboarding } = usePermissions()
  const location = useLocation()

  if (needsEditionOnboarding && !OPEN_WHILE_ONBOARDING.has(location.pathname)) {
    return <OnboardingPage />
  }
  return <Outlet />
}
