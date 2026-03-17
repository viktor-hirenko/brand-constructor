import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  BrandStepData,
  BrandBasicsData,
  BrandConceptData,
  BrandExternalNamingData,
  BrandInternalNamingData,
  BrandMarketingPackageData,
  BrandDeliverablesData,
  BrandVisualComponentsData,
  NewConceptBrief,
  NewNamingBrief,
} from '@brand-constructor/shared/types';

function getInitialStepData(): BrandStepData {
  return {
    brandBasics: {
      geo: [],
      launchDate: '',
      linkedProduct: '',
      comment: '',
    },
    mode: null,
    concept: {
      selectedId: null,
      comment: '',
      newConceptBrief: null,
    },
    externalNaming: {
      selectedIds: [],
      comment: '',
      newNamingBrief: null,
    },
    internalNaming: {
      selectedId: null,
      comment: '',
      newNamingFeedback: null,
    },
    marketingPackage: {
      selectedId: null,
      comment: '',
    },
    deliverables: {
      legalLanding: false,
      partnerLanding: false,
      developmentDeadline: '',
      comment: '',
    },
    visualComponents: {
      selections: {},
      delegateToDesigners: false,
      comment: '',
    },
  };
}

export const useConstructorStore = defineStore('brand-constructor', () => {
  const brandId = ref<string | null>(null);
  const currentStep = ref(1);
  const stepData = ref<BrandStepData>(getInitialStepData());
  const isDraft = ref(true);
  const isLoading = ref(false);
  const isSaving = ref(false);

  const totalSteps = 10;

  const progressPercent = computed(() => {
    return Math.round((currentStep.value / totalSteps) * 100);
  });

  const canGoNext = computed(() => {
    return currentStep.value < totalSteps;
  });

  const canGoBack = computed(() => {
    return currentStep.value > 1;
  });

  function validateStep(step: number): boolean {
    switch (step) {
      case 1:
        return stepData.value.brandBasics.geo.length > 0 && stepData.value.brandBasics.launchDate !== '';
      case 2:
        return stepData.value.mode !== null;
      case 3:
        return stepData.value.concept.selectedId !== null || stepData.value.concept.newConceptBrief !== null;
      case 4: {
        const en = stepData.value.externalNaming;
        if (en.newNamingBrief !== null) return true;
        if (en.selectedIds.length === 0) return false;
        if (en.selectedIds.length > 1 && en.comment.trim() === '') return false;
        return true;
      }
      case 5: {
        const inn = stepData.value.internalNaming;
        return inn.selectedId !== null || (inn.newNamingFeedback !== null && inn.newNamingFeedback.trim() !== '');
      }
      case 7:
        return stepData.value.marketingPackage.selectedId !== null;
      case 8: {
        const del = stepData.value.deliverables;
        const hasAnythingEnabled = del.legalLanding || del.partnerLanding;
        if (hasAnythingEnabled && del.developmentDeadline === '') return false;
        return true;
      }
      case 9: {
        const vc = stepData.value.visualComponents;
        if (vc.delegateToDesigners) return true;
        const selectionCount = Object.keys(vc.selections).length;
        if (selectionCount === 0) return false;
        if (hasComponentConflicts.value) return false;
        return true;
      }
      default:
        return true;
    }
  }

  const isCurrentStepValid = computed(() => validateStep(currentStep.value));

  function setBrandBasics(data: Partial<BrandBasicsData>) {
    stepData.value.brandBasics = {
      ...stepData.value.brandBasics,
      ...data,
    };
  }

  function setMode(mode: 'light' | 'dark') {
    stepData.value.mode = mode;
  }

  function setConcept(data: Partial<BrandConceptData>) {
    stepData.value.concept = {
      ...stepData.value.concept,
      ...data,
    };
  }

  function setNewConceptBrief(brief: NewConceptBrief | null) {
    stepData.value.concept.newConceptBrief = brief;
  }

  const shouldSkipStep4 = computed(() => {
    return stepData.value.concept.newConceptBrief !== null;
  });

  function setNewNamingBrief(brief: NewNamingBrief | null) {
    stepData.value.externalNaming.newNamingBrief = brief;
  }

  function setExternalNaming(data: Partial<BrandExternalNamingData>) {
    stepData.value.externalNaming = {
      ...stepData.value.externalNaming,
      ...data,
    };
  }

  function toggleExternalNaming(namingId: string) {
    const ids = stepData.value.externalNaming.selectedIds;
    const index = ids.indexOf(namingId);
    
    if (index === -1) {
      if (ids.length < 3) {
        ids.push(namingId);
      }
    } else {
      ids.splice(index, 1);
    }
  }

  function setInternalNaming(data: Partial<BrandInternalNamingData>) {
    stepData.value.internalNaming = {
      ...stepData.value.internalNaming,
      ...data,
    };
  }

  function selectInternalNaming(namingId: string | null) {
    stepData.value.internalNaming.selectedId =
      stepData.value.internalNaming.selectedId === namingId ? null : namingId;
  }

  function setInternalNamingFeedback(feedback: string | null) {
    stepData.value.internalNaming.newNamingFeedback = feedback;
  }

  function setMarketingPackage(data: Partial<BrandMarketingPackageData>) {
    stepData.value.marketingPackage = {
      ...stepData.value.marketingPackage,
      ...data,
    };
  }

  function setDeliverables(data: Partial<BrandDeliverablesData>) {
    stepData.value.deliverables = {
      ...stepData.value.deliverables,
      ...data,
    };
  }

  function setVisualComponents(data: Partial<BrandVisualComponentsData>) {
    stepData.value.visualComponents = {
      ...stepData.value.visualComponents,
      ...data,
    };
  }

  function setComponentSelection(componentTypeId: string, variantId: string) {
    stepData.value.visualComponents.selections[componentTypeId] = variantId;
  }

  function removeComponentSelection(componentTypeId: string) {
    delete stepData.value.visualComponents.selections[componentTypeId];
  }

  function toggleDelegateToDesigners(value: boolean) {
    stepData.value.visualComponents.delegateToDesigners = value;
  }

  function resetVisualSelections() {
    stepData.value.visualComponents.selections = {};
  }

  const hasComponentConflicts = computed(() => {
    return componentConflicts.value.length > 0;
  });

  const componentConflicts = computed<Array<{ typeA: string; variantA: string; typeB: string; variantB: string }>>(() => {
    return [];
  });

  function goToStep(step: number) {
    if (step >= 1 && step <= totalSteps) {
      currentStep.value = step;
    }
  }

  function nextStep() {
    if (canGoNext.value) {
      currentStep.value++;
    }
  }

  function prevStep() {
    if (canGoBack.value) {
      currentStep.value--;
    }
  }

  function reset() {
    brandId.value = null;
    currentStep.value = 1;
    stepData.value = getInitialStepData();
    isDraft.value = true;
  }

  function loadBrand(id: string, data: BrandStepData, step: number) {
    brandId.value = id;
    stepData.value = data;
    currentStep.value = step;
    isDraft.value = false;
  }

  return {
    brandId,
    currentStep,
    stepData,
    isDraft,
    isLoading,
    isSaving,
    totalSteps,
    progressPercent,
    canGoNext,
    canGoBack,
    isCurrentStepValid,
    validateStep,
    setBrandBasics,
    setMode,
    setConcept,
    setNewConceptBrief,
    shouldSkipStep4,
    setNewNamingBrief,
    setExternalNaming,
    toggleExternalNaming,
    setInternalNaming,
    selectInternalNaming,
    setInternalNamingFeedback,
    setMarketingPackage,
    setDeliverables,
    setVisualComponents,
    setComponentSelection,
    removeComponentSelection,
    toggleDelegateToDesigners,
    resetVisualSelections,
    hasComponentConflicts,
    componentConflicts,
    goToStep,
    nextStep,
    prevStep,
    reset,
    loadBrand,
  };
});
