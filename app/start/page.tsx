'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { FEAR_QUESTIONS, DEFENSE_QUESTIONS, DISTRESS_QUESTIONS, Question, FearAxis, DefenseAxis } from '@/data/questions';
import { calculateFearScores, calculateDefenseScores, calculateDistressTotal, findTypes } from '@/lib/scoring';
import { DiagType } from '@/data/types';
import { saveDiagnostic } from '@/lib/analytics';
import IntroScreen from '@/components/IntroScreen';
import QuestionScreen from '@/components/QuestionScreen';
import DistressIntroScreen from '@/components/DistressIntroScreen';
import StepFlow from '@/components/StepFlow';

type Screen = 'intro' | 'strength' | 'distress-intro' | 'distress' | 'step-flow';

interface ResultData {
  firstType: DiagType;
  secondType: DiagType;
  fearScores: Record<FearAxis, number>;
  defenseScores: Record<DefenseAxis, number>;
  distressTotal: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOrCreateDeviceId(): string {
  const KEY = '10type_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

const TOTAL_QUESTIONS = 36; // 20 fear + 12 defense + 4 distress

function StartInner() {
  const searchParams = useSearchParams();
  const [screen, setScreen] = useState<Screen>('intro');
  const [sessionId, setSessionId] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string>('');
  const [strengthOrder, setStrengthOrder] = useState<string[]>([]);
  const [strengthIndex, setStrengthIndex] = useState(0);
  const [distressIndex, setDistressIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [resultData, setResultData] = useState<ResultData | null>(null);

  // Combined ordered question list for shuffled strength phase (fear + defense)
  const STRENGTH_QUESTIONS: Question[] = [...FEAR_QUESTIONS, ...DEFENSE_QUESTIONS];
  const allQuestions: Question[] = [...STRENGTH_QUESTIONS, ...DISTRESS_QUESTIONS];

  useEffect(() => {
    if (searchParams.get('from')) handleStart();
  }, []);

  function handleStart() {
    setSessionId(crypto.randomUUID());
    setDeviceId(getOrCreateDeviceId());
    setStrengthOrder(shuffle(STRENGTH_QUESTIONS.map(q => q.id)));
    setStrengthIndex(0);
    setDistressIndex(0);
    setAnswers({});
    setResultData(null);
    setScreen('strength');
  }

  function handleStrengthAnswer(value: number) {
    const qId = strengthOrder[strengthIndex];
    const newAnswers = { ...answers, [qId]: value };
    setAnswers(newAnswers);
    if (strengthIndex < STRENGTH_QUESTIONS.length - 1) {
      setStrengthIndex(strengthIndex + 1);
    } else {
      setScreen('distress-intro');
    }
  }

  function handleStrengthBack() {
    if (strengthIndex > 0) {
      setStrengthIndex(strengthIndex - 1);
    } else {
      setScreen('intro');
    }
  }

  function handleDistressAnswer(value: number) {
    const qId = DISTRESS_QUESTIONS[distressIndex].id;
    const newAnswers = { ...answers, [qId]: value };
    setAnswers(newAnswers);
    if (distressIndex < DISTRESS_QUESTIONS.length - 1) {
      setDistressIndex(distressIndex + 1);
    } else {
      const fearScores = calculateFearScores(newAnswers, allQuestions);
      const defenseScores = calculateDefenseScores(newAnswers, allQuestions);
      const distressTotal = calculateDistressTotal(newAnswers, allQuestions);
      const { first, second } = findTypes(fearScores, defenseScores);
      const rd = { firstType: first, secondType: second, fearScores, defenseScores, distressTotal };
      setResultData(rd);
      saveDiagnostic({
        sessionId,
        deviceId,
        answers: newAnswers,
        firstType: first,
        secondType: second,
        fearScores,
        defenseScores,
        distressTotal,
        feedbackRating: null,
        retypeSelectedName: null,
        retypeSelectedNone: false,
      });
      setScreen('step-flow');
    }
  }

  function handleDistressBack() {
    if (distressIndex > 0) {
      setDistressIndex(distressIndex - 1);
    } else {
      setScreen('distress-intro');
    }
  }

  if (screen === 'intro') {
    return <IntroScreen onStart={handleStart} />;
  }

  if (screen === 'strength') {
    const qId = strengthOrder[strengthIndex];
    const question = STRENGTH_QUESTIONS.find(q => q.id === qId);
    if (!question) return null;
    return (
      <QuestionScreen
        question={question}
        questionNumber={strengthIndex + 1}
        totalQuestions={TOTAL_QUESTIONS}
        currentAnswer={answers[question.id]}
        onAnswer={handleStrengthAnswer}
        onBack={handleStrengthBack}
        isDistress={false}
      />
    );
  }

  if (screen === 'distress-intro') {
    return (
      <DistressIntroScreen
        onContinue={() => { setDistressIndex(0); setScreen('distress'); }}
        onBack={() => { setStrengthIndex(STRENGTH_QUESTIONS.length - 1); setScreen('strength'); }}
      />
    );
  }

  if (screen === 'distress') {
    const question = DISTRESS_QUESTIONS[distressIndex];
    return (
      <QuestionScreen
        question={question}
        questionNumber={STRENGTH_QUESTIONS.length + distressIndex + 1}
        totalQuestions={TOTAL_QUESTIONS}
        currentAnswer={answers[question.id]}
        onAnswer={handleDistressAnswer}
        onBack={handleDistressBack}
        isDistress={true}
      />
    );
  }

  if (screen === 'step-flow' && resultData) {
    return (
      <StepFlow
        firstType={resultData.firstType}
        secondType={resultData.secondType}
        fearScores={resultData.fearScores}
        defenseScores={resultData.defenseScores}
        distressTotal={resultData.distressTotal}
        sessionId={sessionId}
        onRestart={() => setScreen('intro')}
      />
    );
  }

  return null;
}

export default function StartPage() {
  return (
    <Suspense>
      <StartInner />
    </Suspense>
  );
}
