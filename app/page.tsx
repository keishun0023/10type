'use client';

import { useState } from 'react';
import { FEAR_QUESTIONS, DEFENSE_QUESTIONS, DISTRESS_QUESTIONS, Question, FearAxis, DefenseAxis } from '@/data/questions';
import { calculateFearScores, calculateDefenseScores, calculateDistressTotal, findTypes, getRetypeCandidates } from '@/lib/scoring';
import { DiagType } from '@/data/types';
import { saveDiagnostic } from '@/lib/analytics';
import IntroScreen from '@/components/IntroScreen';
import QuestionScreen from '@/components/QuestionScreen';
import DistressIntroScreen from '@/components/DistressIntroScreen';
import ResultScreen from '@/components/ResultScreen';
import FeedbackScreen from '@/components/FeedbackScreen';
import RetypeScreen from '@/components/RetypeScreen';
import ThankYouScreen from '@/components/ThankYouScreen';

type Screen = 'intro' | 'strength' | 'distress-intro' | 'distress' | 'result' | 'feedback' | 'retype' | 'thankyou';

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

export default function Home() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [sessionId, setSessionId] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string>('');
  const [strengthOrder, setStrengthOrder] = useState<string[]>([]);
  const [strengthIndex, setStrengthIndex] = useState(0);
  const [distressIndex, setDistressIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [retypeSelectedName, setRetypeSelectedName] = useState<string | null | undefined>(undefined);

  // Combined ordered question list for shuffled strength phase (fear + defense)
  const STRENGTH_QUESTIONS: Question[] = [...FEAR_QUESTIONS, ...DEFENSE_QUESTIONS];
  const allQuestions: Question[] = [...STRENGTH_QUESTIONS, ...DISTRESS_QUESTIONS];

  function handleStart() {
    setSessionId(crypto.randomUUID());
    setDeviceId(getOrCreateDeviceId());
    setStrengthOrder(shuffle(STRENGTH_QUESTIONS.map(q => q.id)));
    setStrengthIndex(0);
    setDistressIndex(0);
    setAnswers({});
    setResultData(null);
    setFeedbackRating(null);
    setRetypeSelectedName(undefined);
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
      setResultData({ firstType: first, secondType: second, fearScores, defenseScores, distressTotal });
      setScreen('result');
    }
  }

  function handleDistressBack() {
    if (distressIndex > 0) {
      setDistressIndex(distressIndex - 1);
    } else {
      setScreen('distress-intro');
    }
  }

  function handleFeedbackRate(rating: number) {
    setFeedbackRating(rating);
    if (rating >= 4) {
      goToThankYou(rating, undefined);
    } else {
      setScreen('retype');
    }
  }

  function handleRetypeSubmit(selectedTypeId: string | null) {
    setRetypeSelectedName(selectedTypeId);
    goToThankYou(feedbackRating, selectedTypeId);
  }

  function goToThankYou(rating: number | null, retype: string | null | undefined) {
    if (resultData) {
      saveDiagnostic({
        sessionId,
        deviceId,
        answers,
        firstType: resultData.firstType,
        secondType: resultData.secondType,
        fearScores: resultData.fearScores,
        defenseScores: resultData.defenseScores,
        distressTotal: resultData.distressTotal,
        feedbackRating: rating,
        retypeSelectedName: retype ?? null,
        retypeSelectedNone: retype === null,
      });
    }
    setScreen('thankyou');
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

  if (screen === 'result' && resultData) {
    return (
      <ResultScreen
        firstType={resultData.firstType}
        secondType={resultData.secondType}
        fearScores={resultData.fearScores}
        defenseScores={resultData.defenseScores}
        distressTotal={resultData.distressTotal}
        sessionId={sessionId}
        onRestart={() => setScreen('intro')}
        onNextFeedback={() => setScreen('feedback')}
      />
    );
  }

  if (screen === 'feedback' && resultData) {
    return (
      <FeedbackScreen
        typeName={resultData.firstType.name}
        onRate={handleFeedbackRate}
      />
    );
  }

  if (screen === 'retype' && resultData) {
    const candidates = getRetypeCandidates(resultData.fearScores, resultData.defenseScores, resultData.firstType.id);
    const retypeMode: 'partial' | 'miss' = (feedbackRating ?? 0) >= 3 ? 'partial' : 'miss';
    return (
      <RetypeScreen
        candidates={candidates}
        mode={retypeMode}
        onSubmit={handleRetypeSubmit}
      />
    );
  }

  if (screen === 'thankyou') {
    return <ThankYouScreen onRestart={() => setScreen('intro')} />;
  }

  return null;
}
