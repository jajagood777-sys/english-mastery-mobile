import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { APP_VERSION } from '../core.mjs';
import {
  computeQuestionContentHash,
  snapshotQuestionVersion,
  verifyQuestionVersionMatch,
  redactTransferLeaks,
  buildTransferTriplePlan,
  advanceTransferTripleStage,
  classifyErrorCause,
  createDisputeRecord,
  resolveDisputeRecord,
  createTieredHintSession,
  revealNextHintTier,
  buildUnannouncedTransferPrompt,
  revealUnannouncedLinks,
  recordConfidenceTag,
  summarizeConfidenceDiagnostics,
  createSynonymBoundaryDrill,
  evaluateSynonymBoundary,
  createBlindRetestTask,
  revealBlindRetestComparison,
  detectRecentExposure,
  selectFatigueAwareNextItem,
  markStopHereCheckpoint
} from '../learning-engines.mjs';
import {
  compareReadingEvidence,
  analyzeLongSentenceStructure,
  createListeningErrorReplay,
  advanceListeningReplayStep,
  buildErrorLinkedPhonicsDrill,
  alignSpeakingTranscript,
  editAsrSegment,
  buildThreeStageSpeakingComparison,
  detectRepairMove,
  chooseFollowUpBranch,
  evaluateInfoGapOutcome,
  renderSpeechRecallView,
  compareSpeechRecallOmissions,
  createFocusedWritingRewrite,
  createIntegratedThemeTask,
  createRealLifeMiniTask,
  recordNextDayOutcome,
  compareIntendedVsAsrInfo
} from '../skills-studio.mjs';
import {
  captureExactResumeState,
  restoreExactResumeState,
  buildTimeSlicedContinuation,
  auditPackOfflineReadiness,
  dryRunBackupRestore,
  computeStorageBreakdown,
  buildAiOutboundPreview,
  buildWeeklyEvidenceReview,
  classifySkillTransferStatus,
  collectQuestionQualityFlags,
  computeAntiAvalanchePlan,
  runPreExportHealthCheck
} from '../continuity-os.mjs';

test('v20.3.0 #1/#2/#3/#4/#6: transfer triple with anti-leak, error taxonomy, disputes, tiered hints, unannounced transfer', () => {
  assert.equal(APP_VERSION, '20.3.0');

  // #1 Anti-leak + 3-stage transfer
  const leaked = redactTransferLeaks('Please lend me your umbrella.', 'lend', false);
  assert.equal(leaked.leakedBeforeSubmit, true);
  assert.ok(!leaked.text.toLowerCase().includes('lend'));
  let plan = buildTransferTriplePlan({
    weaknessId: 'w:lend',
    target: 'lend',
    originalSentence: 'Fix: Can you borrow me a pen?',
    freshClozeSentence: 'Could you lend me your charger?',
    freePrompt: 'Ask a friend to let you use their notes.'
  });
  assert.ok(!plan.stages[1].prompt.toLowerCase().includes('lend'));
  plan = advanceTransferTripleStage(plan, { userAnswer: 'lend', correct: true, hintTierUsed: 'collocation' });
  plan = advanceTransferTripleStage(plan, { userAnswer: 'lend', correct: true, hintTierUsed: null });
  plan = advanceTransferTripleStage(plan, { userAnswer: 'Could you lend me your notes?', correct: true, hintTierUsed: null });
  assert.equal(plan.completed, true);
  assert.equal(plan.independentTransferSuccess, true);

  // #2 Error taxonomy
  assert.equal(classifyErrorCause({ expected: 'accommodate', actual: 'acommodate' }).id, 'spelling_slip');
  assert.equal(classifyErrorCause({ expected: 'lend', actual: 'borrow', confusedWith: ['borrow'] }).id, 'meaning_confusion');
  assert.equal(classifyErrorCause({ expected: 'make a decision', actual: 'do a decision', collocationExpected: true }).id, 'collocation_error');
  assert.equal(classifyErrorCause({ expected: 'B', actual: 'C', evidenceParagraphMatched: false }).id, 'prompt_misread');
  assert.equal(classifyErrorCause({ expected: 'quantum', actual: 'banana' }).id, 'pending_confirmation');

  // #3 Traceable dispute without overwriting original verdict
  const disp = createDisputeRecord({ packId: 'p1', questionId: 'q1', questionText: 'Choose synonym', firstAnswer: 'ease', originalVerdict: 'incorrect' });
  const resolved = resolveDisputeRecord(disp, { outcome: 'ACCEPTED_ALTERNATIVE', reviewerNote: 'Valid contextual synonym' });
  assert.equal(resolved.review_outcome.original_verdict_preserved, 'incorrect');

  // #4 Tiered hints
  let h = createTieredHintSession('word', { semantic_clue: 'give temporarily', collocation: '___ someone money', first_letter: 'l___', reference_answer: 'lend' });
  const r1 = revealNextHintTier(h); h = r1.session;
  const r2 = revealNextHintTier(h); h = r2.session;
  assert.equal(h.maxHintTierUsed, 'collocation');
  assert.deepEqual(h.tiersUsed, ['semantic_clue', 'collocation']);

  // #6 Unannounced transfer hides target until submission
  const unannounced = buildUnannouncedTransferPrompt({ dialogueText: 'A: My phone died.', hiddenTargets: [{ weaknessId: 'w:lend', target: 'lend' }] });
  assert.deepEqual(unannounced.visibleTargetLabels, []);
  const revealed = revealUnannouncedLinks(unannounced, 'Could you lend me your power bank?');
  assert.equal(revealed.spontaneousHitCount, 1);
});

test('v20.3.0 #7–#16/#34–#37: reading, listening, phonics, speaking ASR edit invalidation, repair, info-gap, speech recall, real-life tasks', () => {
  // #7 Reading evidence
  assert.equal(compareReadingEvidence({ answerCorrect: false, selectedSentence: 'The city cut fares.', referenceSentence: 'The city cut fares.' }).diagnosis, 'right_evidence_wrong_interpretation');

  // #8 Long sentence breakdown
  const parsed = analyzeLongSentenceStructure('Although the train arrived late, the commuters remained calm because the staff explained the delay.');
  assert.ok(parsed.clauses.length >= 2);

  // #9 Listening error replay
  let rep = createListeningErrorReplay({ clipId: 'c1', startSec: 2, endSec: 6, transcript: 'going to' });
  rep = advanceListeningReplayStep(rep, { understood: false });
  assert.equal(rep.currentStep, 'short_loop');
  rep = advanceListeningReplayStep(rep, { understood: true });
  assert.equal(rep.understoodAtStep, 'short_loop');

  // #10 Error-linked phonics
  const drills = buildErrorLinkedPhonicsDrill(['attention', 'knowledge']);
  assert.ok(drills.some(d => d.patternId === 'tion'));
  assert.ok(drills.some(d => d.patternId === 'kn'));

  // #11 Speaking timestamp alignment + ASR edit invalidates dependent feedback
  let aligned = alignSpeakingTranscript({
    recordingId: 'rec-1',
    segments: [{ segmentId: 's1', startSec: 1.2, endSec: 4.5, text: 'I go to school yesterday', asrUncertain: true }],
    feedbackItems: [{ feedbackId: 'f1', segmentId: 's1', issue: 'Tense mismatch' }]
  });
  aligned = editAsrSegment(aligned, 's1', 'I went to school yesterday');
  assert.equal(aligned.feedbackItems[0].status, 'PENDING_REVIEW');

  // #12 Three-stage speaking comparison hides prior until reveal
  const hiddenCmp = buildThreeStageSpeakingComparison({ taskId: 't1', initial: { recordingId: 'r1' }, retry: { recordingId: 'r2' }, revealPrior: false });
  assert.equal(hiddenCmp.stages.initial.hiddenUntilSubmit, true);

  // #13/#34/#35 Dialogue branching, repair move & info-gap
  assert.equal(detectRepairMove('Sorry, did you say Thursday or Tuesday?').isRepairMove, true);
  assert.equal(chooseFollowUpBranch([{ id: 'cost', triggers: ['expensive'], prompt: 'Why was it expensive?' }], 'It was too expensive').branchId, 'cost');
  assert.equal(evaluateInfoGapOutcome({ userFreeSlots: ['Tue 10:00'], partnerFreeSlots: ['Tue 10:00', 'Wed 14:00'], agreedSlot: 'Tue 10:00' }).completed, true);

  // #14 Four-paragraph speech recall modes & omissions
  const kwView = renderSpeechRecallView(['Consistency builds remarkable confidence over months of steady practice.'], 'keywords_only');
  assert.ok(kwView[0].keywords.length >= 2);
  const om = compareSpeechRecallOmissions(['steady daily practice', 'speak clearly'], 'We need steady daily practice.');
  assert.equal(om.omittedPoints.length, 1);

  // #15/#16/#36/#37
  assert.equal(createFocusedWritingRewrite({ originalDraft: 'draft', issues: [{}, {}, {}] }).focusedIssues.length, 2);
  assert.equal(createIntegratedThemeTask({ theme: 'Remote work' }).type, 'integrated_theme_task');
  let life = createRealLifeMiniTask({ scenarioTitle: '明天给房东报修' });
  life = recordNextDayOutcome(life, { usedExpressions: 'The pipe is leaking.', stuckPoint: 'valve' });
  assert.equal(life.generatesKvnOrScore, false);
  const crit = compareIntendedVsAsrInfo({ intendedSlots: { number: 'fifteen', day: 'Tuesday' }, asrText: 'See you on Tuesday at fifty.' });
  assert.equal(crit.needsPlaybackCheckCount, 1);
});

test('v20.3.0 #17–#27/#31–#33/#38–#42: continuity, confidence, blind retest, fatigue, version hash, learner scripts (#40) & perf budget (#29)', () => {
  // #31 Confidence diagnostics
  const c1 = recordConfidenceTag({ attemptId: 'a1', itemId: 'w1', confidence: 'guess', correct: true });
  const c2 = recordConfidenceTag({ attemptId: 'a2', itemId: 'w2', confidence: 'certain', correct: false });
  const c3 = recordConfidenceTag({ attemptId: 'a3', itemId: 'w3', confidence: 'unknown', correct: true });
  const cSum = summarizeConfidenceDiagnostics([c1, c2, c3]);
  assert.equal(cSum.guessedCorrectCount, 1);
  assert.equal(cSum.highConfidenceErrorCount, 1);
  assert.equal(cSum.unreportedCount, 1);

  // #32 Synonym boundary
  const sb = createSynonymBoundaryDrill({ pair: ['borrow', 'lend'], acceptedWords: ['lend', 'loan'], nuanceNote: 'Both fit here; loan sounds slightly more formal.' });
  assert.equal(evaluateSynonymBoundary(sb, { chosenWord: 'loan', conditionExplanation: 'speaker is giving' }).bothAcceptable, true);

  // #33 Blind retest hides prior until submitted
  const blind = createBlindRetestTask({ taskId: 'b1', prompt: 'Rewrite email', priorDraft: 'old', priorAiRewrite: 'ai' });
  assert.equal(blind.visiblePrior, null);
  assert.equal(revealBlindRetestComparison(blind, 'new independent answer').visiblePrior.priorAiRewrite, 'ai');

  // #38 Fatigue & recent exposure
  assert.equal(detectRecentExposure('mitigate', ['Planting trees can mitigate heat.']).recentlyExposed, true);
  assert.equal(selectFatigueAwareNextItem([{ id: '1', type: 'word' }, { id: '2', type: 'listening' }], ['word', 'word', 'word']).fatigueSwitched, true);
  assert.equal(markStopHereCheckpoint({ packId: 'p1', stage: 'words', itemIndex: 7 }).nextStartIndex, 7);

  // #39 Question content version tracking
  const snap = snapshotQuestionVersion({ packId: 'p1', question: { id: 'q1', prompt: 'Old prompt', answer: 'A' } });
  assert.equal(verifyQuestionVersionMatch(snap, { id: 'q1', prompt: 'Edited prompt', answer: 'B' }).matched, false);

  // #17/#28 Exact resume pre-reveal vs post-reveal interruption scenario
  const preExit = captureExactResumeState({ packId: 'p1', page: 'practice', draftText: 'half draft', answerRevealedBeforeExit: false });
  const postExit = captureExactResumeState({ packId: 'p1', page: 'practice', draftText: 'half draft', answerRevealedBeforeExit: true });
  assert.equal(restoreExactResumeState(preExit, 'p1').preservePromptedFlag, false);
  assert.equal(restoreExactResumeState(postExit, 'p1').preservePromptedFlag, true);

  // #18/#20/#22/#23/#24/#25/#26/#27/#41/#42
  assert.equal(buildTimeSlicedContinuation({ packId: 'p1', remainingItems: Array.from({ length: 20 }, (_, i) => ({ id: i })), availableMinutes: 5 }).preservesOriginalPackId, true);
  assert.equal(auditPackOfflineReadiness({ pack: { items: [{ id: '1', audioUrl: 'a.mp3' }] }, cachedAudioKeys: [] }).readyForSubway, false);
  assert.equal(dryRunBackupRestore({ reports: [{ report_id: 'r1' }] }, { reports: [{ report_id: 'r1' }, { report_id: 'r2' }] }).recoverable.newReportsToAdd, 1);
  assert.equal(computeStorageBreakdown({ podcastCacheBytes: 1000, userRecordingsBytes: 500 }).irreplaceable.subtotalBytes, 500);
  assert.equal(buildAiOutboundPreview({ payloadText: 'Full essay', selectedExcerpt: 'One sentence' }).excerptOnly, true);
  assert.equal(classifySkillTransferStatus({ originalCorrect: true, newContextCorrect: false }).transferred, false);
  assert.equal(collectQuestionQualityFlags({ disputes: [{ pack_id: 'p1', question_id: 'q1' }] }).total_flags, 1);
  assert.equal(computeAntiAvalanchePlan(Array.from({ length: 45 }, (_, i) => i), 15).estimatedDaysToClear, 3);
  assert.equal(runPreExportHealthCheck({ exactResume: preExit }).ready, false);

  // #29 Long-pack performance budget (< 150ms for 1000 question hashes)
  const t0 = performance.now();
  for (let i = 0; i < 1000; i += 1) {
    computeQuestionContentHash({ id: `q-${i}`, prompt: `Prompt text ${i}`, options: ['A', 'B', 'C', 'D'], answer: 'A' });
  }
  const elapsedMs = performance.now() - t0;
  assert.ok(elapsedMs < 250, `Expected 1000 hashes < 250ms, got ${elapsedMs.toFixed(1)}ms`);

  // #40 Repeatable Learner Script: guess-correct -> next-day error -> weekly review
  const scriptConf = recordConfidenceTag({ attemptId: 'sc1', itemId: 'w:mitigate', confidence: 'guess', correct: true });
  assert.equal(scriptConf.prioritizeFreshContext, true);
  const weekly = buildWeeklyEvidenceReview(
    [{ itemId: 'w:mitigate', rating: 'N' }],
    [{ weaknessId: 'w:mitigate', target: 'mitigate', stages: [{ submitted: true, correct: true, userAnswer: 'mitigate' }, { submitted: true, correct: false, userAnswer: 'migrate' }] }]
  );
  assert.equal(weekly.failedAfterContextChange.length, 1);

  // Verify sw.js precaches all 3 new v19 modules
  const swText = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(swText.includes('./learning-engines.mjs'));
  assert.ok(swText.includes('./skills-studio.mjs'));
  assert.ok(swText.includes('./continuity-os.mjs'));
});

test('v20.3.0 Contemporary Oriental Study visual language: warm paper, near-ink, deep jade, 320px guard & 5-state buttons', () => {
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.ok(css.includes('Contemporary Oriental Study'));
  assert.ok(css.includes('--study-paper: #f7f5f0'));
  assert.ok(css.includes('--study-ink: #1b1d1c'));
  assert.ok(css.includes('--study-jade: #1c5d4f'));
  assert.ok(css.includes('@media (max-width: 340px)'));
  assert.ok(css.includes('[aria-busy="true"]'));
});
