import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { Steps } from 'primereact/steps';
import { NumberParam, useQueryParams, withDefault } from 'use-query-params';

import { RollupConfig, RollupConfigInput } from '@/components/RollupConfigInput';
import { RollupContractsSummary } from '@/components/RollupContractsSummary';
import { SetValidators } from '@/components/SetValidators';
import { SetBatchPoster } from '@/components/SetBatchPoster';
import { Review } from '@/components/Review';

import { spaceGrotesk } from '@/fonts';
import { deployRollup } from '@/utils/deployRollup';
import { isUserRejectedError } from '@/utils/isUserRejectedError';
import { RollupContracts } from '@/types/RollupContracts';

const steps = [
  {
    label: 'Configure & Deploy Rollup',
  },
  {
    label: 'Configure Validators',
  },
  {
    label: 'Configure Batch Poster',
  },
  {
    label: 'Review & Download Config',
  },
];

const stepsStyleProps = {
  pt: {
    root: {
      style: spaceGrotesk.style,
      className: 'text-sm',
    },
  },
};

enum Step {
  RollupDeploymentConfiguration = 1,
  RollupDeploymentInProgress = 2,
  RollupDeploymentDone = 3,
  ValidatorConfiguration = 4,
  BatchPosterConfiguration = 5,
  Review = 6,
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-left text-3xl">{children}</h1>;
}

const defaultRollupConfig: RollupConfig = {
  confirmPeriodBlocks: 150,
  stakeToken: ethers.constants.AddressZero,
  baseStake: 10000000,
  owner: '',
  extraChallengeTimeBlocks: 0,
  // Needs to be changed after PR by Lee about new Wasm root
  wasmModuleRoot: '0xda4e3ad5e7feacb817c21c8d0220da7650fe9051ece68a3f0b1c5d38bbb27b21',
  loserStakeEscrow: ethers.constants.AddressZero,
  chainId: Math.floor(Math.random() * 100000000000) + 1,
  chainName: 'My Arbitrum L3 Chain',
  chainConfig: ethers.constants.HashZero,
  genesisBlockNum: 0,
  sequencerInboxMaxTimeVariation: {
    delayBlocks: 16,
    futureBlocks: 192,
    delaySeconds: 86400,
    futureSeconds: 7200,
  },
};

export function getServerSideProps() {
  return {
    props: {
      //
    },
  };
}

export default function Configure() {
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const [{ step }, setQueryParams] = useQueryParams({
    step: withDefault(NumberParam, Step.RollupDeploymentConfiguration),
  });

  const [rollupConfig, setRollupConfig] = useState<RollupConfig>(defaultRollupConfig);
  const [rollupContracts, setRollupContracts] = useState<RollupContracts | undefined>(undefined);

  const activeIndex = useMemo(() => {
    if (step < Step.ValidatorConfiguration) {
      return 0;
    }

    return step - 3;
  }, [step]);

  const setStep = useCallback(
    (_step: number) => {
      setQueryParams({ step: _step });
    },
    [setQueryParams],
  );

  async function handleDeployRollupFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setStep(Step.RollupDeploymentInProgress);
      setRollupContracts(await deployRollup(rollupConfig));
      setStep(Step.RollupDeploymentDone);
    } catch (error) {
      setStep(Step.RollupDeploymentConfiguration);

      if (!isUserRejectedError(error)) {
        console.error(error);
        alert(error);
      }
    }
  }

  useEffect(() => {
    if (step === Step.RollupDeploymentDone) {
      nextButtonRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [step]);

  return (
    <div className="flex w-full justify-center py-8">
      <div className="flex w-[768px] flex-col">
        <Steps model={steps} activeIndex={activeIndex} className="w-full" {...stepsStyleProps} />
        <div className="h-16" />

        {step < Step.ValidatorConfiguration && (
          <form onSubmit={handleDeployRollupFormSubmit}>
            <StepTitle>Configure & Deploy Rollup</StepTitle>
            <div className="h-4" />
            <RollupConfigInput value={rollupConfig} onChange={(value) => setRollupConfig(value)} />
            <div className="h-8" />
            {step < Step.RollupDeploymentDone ? (
              <button
                type="submit"
                disabled={step === Step.RollupDeploymentInProgress}
                className="w-full rounded-lg bg-[#243145] px-3 py-2 text-2xl text-white"
              >
                {step === Step.RollupDeploymentInProgress ? 'Deploying Rollup...' : 'Deploy Rollup'}
              </button>
            ) : (
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  ref={nextButtonRef}
                  onClick={() => setStep(Step.ValidatorConfiguration)}
                  className="w-full rounded-lg bg-[#243145] px-3 py-2 text-2xl text-white"
                >
                  Next
                </button>
                <RollupContractsSummary {...rollupContracts!} />
              </div>
            )}
          </form>
        )}

        {step === Step.ValidatorConfiguration && (
          <>
            <StepTitle>Configure Validators</StepTitle>
            <div className="h-4" />
            <SetValidators onNext={() => setStep(Step.BatchPosterConfiguration)} />
          </>
        )}

        {step === Step.BatchPosterConfiguration && (
          <>
            <StepTitle>Configure Batch Poster</StepTitle>
            <div className="h-4" />
            <SetBatchPoster onNext={() => setStep(Step.Review)} />
          </>
        )}

        {step === Step.Review && (
          <>
            <StepTitle>Review & Download Config</StepTitle>
            <div className="h-4" />
            <Review />
          </>
        )}
      </div>
    </div>
  );
}