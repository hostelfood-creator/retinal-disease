"use client";

import React from "react";
import { MultiStepLoader as Loader } from "@/components/ui/multi-step-loader";

const loadingStates = [
  {
    text: "Initializing Neural Engine",
  },
  {
    text: "Loading Fundus Photographs",
  },
  {
    text: "Pre-processing Clinical Data",
  },
  {
    text: "Running DenseNet121 Inference",
  },
  {
    text: "Analyzing Pathological Features",
  },
  {
    text: "Calculating Severity Probability",
  },
  {
    text: "Validating Diagnostic Consistency",
  },
  {
    text: "Generating Clinical Report",
  },
];

export const ProcessingOverlay = ({ loading }: { loading: boolean }) => {
  return (
    <Loader 
      loadingStates={loadingStates} 
      loading={loading} 
      duration={1500} 
      loop={false}
    />
  );
};
