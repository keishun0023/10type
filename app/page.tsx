'use client';

import { useState } from 'react';
import { STRENGTH_QUESTIONS, DISTRESS_QUESTIONS, Question } from '@/data/questions';
import { calculateAxisScores, calculateDistressTotal, findTypes } from '@/lib/scoring';
import IntroScreen from '@/components/IntroScreen';
import QuestionScreen from '@/components/QuestionScreen';
import DistressIntroScreen from '@/components/DistressIntroScreen';
import ResultScreen from '@/components/ResultScreen';

type Screen = 'intro' | 'strength' | 'distress-intro' | 'distress' | 'result';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [strengthOrder, setStrengthOrder] = useState<string[]>([]);
  const [strengthIndex, setStrengthIndex] = useState(0);
  const [distressIndex, setDistressIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const allQuestions: Question[] = [...STRENGTH_QUESTIONS, ...DISTRESS_QUESTIONS];

  function handleStart() {
    setStrengthOrder(shuffle(STRENGTH_QUESTIONS.map(q => q.id)));
    setStrengthIndex(0);
    setDistressIndex(0);
    setAnswers({});
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
        totalQuestions={40}
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
        questionNumber={32 + distressIndex + 1}
        totalQuestions={40}
        currentAnswer={answers[question.id]}
        onAnswer={handleDistressAnswer}
        onBack={handleDistressBack}
        isDistress={true}
      />
    );
  }

  // result
  const axisScores = calculateAxisScores(answers, allQuestions);
  const distressTotal = calculateDistressTotal(answers, allQuestions);
  const { first, second } = findTypes(axisScores);

  return (
    <ResultScreen
      firstType={first}
      secondType={second}
      axisScores={axisScores}
      distressTotal={distressTotal}
      onRestart={() => setScreen('intro')}
    />
  );
}
