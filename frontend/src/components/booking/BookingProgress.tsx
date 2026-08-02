'use client';

import Stepper from '@/components/ui/Stepper';

const steps = ['Select Vehicle', 'Choose Dates', 'Confirm Booking', 'Payment', 'Complete'];

export default function BookingProgress({ currentStep }: { currentStep: number }) {
  return <Stepper steps={steps} currentStep={currentStep} />;
}
