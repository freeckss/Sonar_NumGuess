window.Sonar = window.Sonar || {};
var S = window.Sonar;

let savedWins = 0;
let savedBestTurns = 0;

try {
  savedWins = Number.parseInt(sessionStorage.getItem('sonar_x86_wins') || '0', 10);
  savedBestTurns = Number.parseInt(sessionStorage.getItem('sonar_x86_best') || '0', 10);
} catch (error) {
  savedWins = 0;
  savedBestTurns = 0;
}

S.state = {
  maxRange: 100,
  maxAttempts: 7,
  attemptsLeft: 7,
  targetNum: 50,
  lastGuess: null,
  lastDelta: null,
  gameOver: false,
  gameStarted: false,
  ttsEnabled: true,
  continuousPulse: false,
  blindfoldMode: false,
  highContrast: false,
  guessHistory: [],
  radarAngle: 0,
  wins: savedWins,
  bestTurns: savedBestTurns,
  gameMode: 'classic',
  defusalStreak: 0,
  timeLimit: 60,
  timeLeft: 60,
  countdownTimer: null,
  targetFrequencyHz: 440,
  playerFrequencyHz: 440,
  targetWavePhase: 0,
  guessWavePhase: 0
};

S.ui = S.ui || {};
