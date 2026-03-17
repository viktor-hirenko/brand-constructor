import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useConstructorStore } from '@/stores/constructor';

export function useStepNavigation() {
  const router = useRouter();
  const route = useRoute();
  const store = useConstructorStore();

  const currentStep = computed(() => {
    return (route.meta.step as number) || store.currentStep;
  });

  const isFirstStep = computed(() => currentStep.value === 1);
  const isLastStep = computed(() => currentStep.value === store.totalSteps);

  function goToStep(step: number) {
    if (step >= 1 && step <= store.totalSteps) {
      store.goToStep(step);
      router.push(`/constructor/step/${step}`);
    }
  }

  function nextStep() {
    if (!isLastStep.value) {
      const next = currentStep.value + 1;
      store.goToStep(next);
      router.push(`/constructor/step/${next}`);
    }
  }

  function prevStep() {
    if (!isFirstStep.value) {
      const prev = currentStep.value - 1;
      store.goToStep(prev);
      router.push(`/constructor/step/${prev}`);
    }
  }

  function validateCurrentStep(): boolean {
    const data = store.stepData;
    
    switch (currentStep.value) {
      case 1:
        return Boolean(data.brandBasics.geo && data.brandBasics.launchDate);
      case 2:
        return data.mode !== null;
      case 3:
        return data.concept.selectedId !== null || data.concept.newConceptBrief !== null;
      case 4:
        return data.externalNaming.selectedIds.length > 0;
      case 5:
        return data.internalNaming.selectedId !== null;
      case 6:
        return true;
      case 7:
        return data.marketingPackage.selectedId !== null;
      case 8:
        return true;
      case 9:
        return Object.keys(data.visualComponents.selections).length > 0 || 
               data.visualComponents.delegateToDesigners;
      case 10:
        return true;
      default:
        return true;
    }
  }

  return {
    currentStep,
    isFirstStep,
    isLastStep,
    totalSteps: store.totalSteps,
    progressPercent: store.progressPercent,
    goToStep,
    nextStep,
    prevStep,
    validateCurrentStep,
  };
}
