import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Home, Gamepad2 } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface DreamStoryGameProps {
  onBack: () => void;
}

interface GameState {
  energy: number;
  sleep: number;
  health: number;
  happiness: number;
  day: number;
  hour: number;
  minute: number;
  gameSpeed: number;
  isPaused: boolean;
  isGameOver: boolean;
  gameOverReason: string;
  currentRoom: 'bedroom' | 'living' | 'kitchen' | 'gym' | 'bathroom';
  characterState: 'idle' | 'sleep' | 'eat' | 'exercise' | 'relax' | 'drinkWater' | 'shower';
  usedObjects: Set<string>;
}

interface GameAction {
  id: string;
  name: string;
  energy: number;
  sleep: number;
  health: number;
  happiness: number;
  duration: number; // em minutos
  room: string;
  state: string;
}

const DreamStoryGame: React.FC<DreamStoryGameProps> = ({ onBack }) => {
  const { isDark } = useTheme();
  const [gameState, setGameState] = useState<GameState>({
    energy: 80,
    sleep: 70,
    health: 85,
    happiness: 75,
    day: 1,
    hour: 7,
    minute: 0,
    gameSpeed: 1,
    isPaused: false,
    isGameOver: false,
    gameOverReason: '',
    currentRoom: 'bedroom',
    characterState: 'idle',
    usedObjects: new Set()
  });

  const [isMuted, setIsMuted] = useState(false);
  const [gameStyle, setGameStyle] = useState<'2d' | 'isometric'>('2d');
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const gameActions: GameAction[] = [
    { id: 'bed', name: 'Dormir', energy: 40, sleep: 50, health: 10, happiness: 5, duration: 480, room: 'bedroom', state: 'sleep' },
    { id: 'sofa', name: 'Relaxar', energy: 5, sleep: -5, health: 0, happiness: 15, duration: 60, room: 'living', state: 'relax' },
    { id: 'table', name: 'Comer', energy: 15, sleep: -5, health: 20, happiness: 10, duration: 30, room: 'kitchen', state: 'eat' },
    { id: 'water', name: 'Beber Água', energy: 5, sleep: 0, health: 15, happiness: 5, duration: 5, room: 'kitchen', state: 'drinkWater' },
    { id: 'exercise', name: 'Exercitar', energy: -20, sleep: 10, health: 25, happiness: 20, duration: 60, room: 'gym', state: 'exercise' },
    { id: 'shower', name: 'Banho', energy: 10, sleep: 5, health: 15, happiness: 15, duration: 20, room: 'bathroom', state: 'shower' },
    { id: 'computer', name: 'Usar PC', energy: -10, sleep: -15, health: -5, happiness: 20, duration: 120, room: 'bedroom', state: 'relax' },
    { id: 'tv', name: 'Assistir TV', energy: -5, sleep: -10, health: -2, happiness: 15, duration: 90, room: 'living', state: 'relax' },
    { id: 'videogame', name: 'Jogar', energy: -15, sleep: -20, health: -5, happiness: 25, duration: 120, room: 'living', state: 'relax' },
    { id: 'treadmill', name: 'Esteira', energy: -25, sleep: 15, health: 30, happiness: 15, duration: 45, room: 'gym', state: 'exercise' },
    { id: 'dumbbells', name: 'Musculação', energy: -30, sleep: 20, health: 35, happiness: 20, duration: 60, room: 'gym', state: 'exercise' },
    { id: 'yoga-mat', name: 'Yoga', energy: -10, sleep: 25, health: 20, happiness: 30, duration: 45, room: 'gym', state: 'exercise' },
    { id: 'skincare', name: 'Cuidados', energy: 5, sleep: 10, health: 10, happiness: 20, duration: 15, room: 'bathroom', state: 'relax' },
    { id: 'fridge', name: 'Lanche', energy: 10, sleep: -2, health: 5, happiness: 8, duration: 10, room: 'kitchen', state: 'eat' },
    { id: 'stove', name: 'Cozinhar', energy: -5, sleep: 0, health: 25, happiness: 15, duration: 45, room: 'kitchen', state: 'eat' },
    { id: 'microwave', name: 'Aquecer', energy: 8, sleep: -3, health: 8, happiness: 5, duration: 5, room: 'kitchen', state: 'eat' }
  ];

  const rooms = [
    { id: 'bedroom', name: 'Quarto', icon: '🛏️' },
    { id: 'living', name: 'Sala', icon: '🛋️' },
    { id: 'kitchen', name: 'Cozinha', icon: '🍽️' },
    { id: 'gym', name: 'Academia', icon: '💪' },
    { id: 'bathroom', name: 'Banheiro', icon: '🚿' }
  ];

  const resetGame = () => {
    setGameState({
      energy: 80,
      sleep: 70,
      health: 85,
      happiness: 75,
      day: 1,
      hour: 7,
      minute: 0,
      gameSpeed: 1,
      isPaused: false,
      isGameOver: false,
      gameOverReason: '',
      currentRoom: 'bedroom',
      characterState: 'idle',
      usedObjects: new Set()
    });
  };

  const togglePause = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const changeGameSpeed = () => {
    setGameState(prev => ({
      ...prev,
      gameSpeed: prev.gameSpeed === 1 ? 2 : prev.gameSpeed === 2 ? 4 : 1
    }));
  };

  const changeRoom = (roomId: string) => {
    setGameState(prev => ({ 
      ...prev, 
      currentRoom: roomId as any,
      characterState: 'idle'
    }));
  };

  const performAction = (actionId: string) => {
    const action = gameActions.find(a => a.id === actionId);
    if (!action) return;

    const objectKey = `${gameState.day}-${actionId}`;
    if (gameState.usedObjects.has(objectKey)) return;

    setGameState(prev => {
      const newEnergy = Math.max(0, Math.min(100, prev.energy + action.energy));
      const newSleep = Math.max(0, Math.min(100, prev.sleep + action.sleep));
      const newHealth = Math.max(0, Math.min(100, prev.health + action.health));
      const newHappiness = Math.max(0, Math.min(100, prev.happiness + action.happiness));

      const newUsedObjects = new Set(prev.usedObjects);
      newUsedObjects.add(objectKey);

      let newHour = prev.hour;
      let newMinute = prev.minute + action.duration;
      
      while (newMinute >= 60) {
        newHour += 1;
        newMinute -= 60;
      }

      let newDay = prev.day;
      if (newHour >= 24) {
        newDay += 1;
        newHour = newHour % 24;
        newUsedObjects.clear();
      }

      return {
        ...prev,
        energy: newEnergy,
        sleep: newSleep,
        health: newHealth,
        happiness: newHappiness,
        hour: newHour,
        minute: newMinute,
        day: newDay,
        characterState: action.state as any,
        usedObjects: newUsedObjects
      };
    });

    setTimeout(() => {
      setGameState(prev => ({ ...prev, characterState: 'idle' }));
    }, 2000);
  };

  useEffect(() => {
    if (gameState.isPaused || gameState.isGameOver) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(() => {
      setGameState(prev => {
        let newMinute = prev.minute + (1 * prev.gameSpeed);
        let newHour = prev.hour;
        let newDay = prev.day;

        while (newMinute >= 60) {
          newHour += 1;
          newMinute -= 60;
        }

        if (newHour >= 24) {
          newDay += 1;
          newHour = newHour % 24;
          prev.usedObjects.clear();
        }

        let newEnergy = prev.energy;
        let newSleep = prev.sleep;
        let newHealth = prev.health;
        let newHappiness = prev.happiness;

        if (newHour >= 22 || newHour <= 6) {
          newEnergy = Math.max(0, newEnergy - 0.3);
        } else {
          newEnergy = Math.max(0, newEnergy - 0.1);
        }

        if (newHour >= 23 || newHour <= 5) {
          newSleep = Math.max(0, newSleep - 0.4);
        } else {
          newSleep = Math.max(0, newSleep - 0.1);
        }

        newHealth = Math.max(0, newHealth - 0.05);
        newHappiness = Math.max(0, newHappiness - 0.08);

        let isGameOver = false;
        let gameOverReason = '';

        if (newEnergy <= 0) {
          isGameOver = true;
          gameOverReason = 'Sua energia acabou! Alex desmaiou de cansaço.';
        } else if (newSleep <= 0) {
          isGameOver = true;
          gameOverReason = 'Alex não consegue mais ficar acordado! Precisa dormir urgentemente.';
        } else if (newHealth <= 0) {
          isGameOver = true;
          gameOverReason = 'A saúde de Alex está muito baixa! Ele precisa de cuidados médicos.';
        }

        return {
          ...prev,
          minute: newMinute,
          hour: newHour,
          day: newDay,
          energy: newEnergy,
          sleep: newSleep,
          health: newHealth,
          happiness: newHappiness,
          isGameOver,
          gameOverReason
        };
      });
    }, 100);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.isPaused, gameState.isGameOver, gameState.gameSpeed]);

  const getStatColor = (value: number) => {
    if (value >= 70) return 'text-emerald-400';
    if (value >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatBgColor = (value: number) => {
    if (value >= 70) return 'bg-emerald-500';
    if (value >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const renderGameObjects = () => {
    const roomObjects = gameActions.filter(action => action.room === gameState.currentRoom);
    
    return roomObjects.map(action => {
      const objectKey = `${gameState.day}-${action.id}`;
      const isUsed = gameState.usedObjects.has(objectKey);
      const isAvailable = !isUsed;

      return (
        <div
          key={action.id}
          onClick={() => isAvailable && performAction(action.id)}
          className={`pixel-object ${action.id} ${gameStyle === '2d' ? 'pixel-' + action.id : 'isometric-' + action.id} ${
            isUsed ? 'used' : isAvailable ? 'available' : ''
          }`}
          title={isUsed ? `${action.name} (Já usado hoje)` : action.name}
        >
          {isUsed && <div className={`${gameStyle === '2d' ? 'pixel-completion' : 'isometric-completion'}`}>✓</div>}
        </div>
      );
    });
  };

  // Game Over Screen
  if (gameState.isGameOver) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark 
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950' 
          : 'bg-gradient-to-br from-white via-emerald-50/80 to-emerald-100/60'
      }`}>
        <div className={`backdrop-blur-sm rounded-2xl p-8 border max-w-md w-full mx-6 text-center transition-colors duration-300 ${
          isDark 
            ? 'bg-slate-900/80 border-slate-800' 
            : 'bg-white/90 border-gray-200 shadow-lg'
        }`}>
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">😵</span>
          </div>
          
          <h2 className={`text-xl font-bold mb-3 transition-colors duration-300 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Game Over!
          </h2>
          
          <p className={`text-sm mb-6 transition-colors duration-300 ${
            isDark ? 'text-slate-400' : 'text-gray-600'
          }`}>
            {gameState.gameOverReason}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Voltar
            </button>
            <button
              onClick={resetGame}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-medium transition-colors"
            >
              Reiniciar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getCurrentWeek = () => {
    return Math.ceil(gameState.day / 7);
  };

  const getWeekProgress = () => {
    const currentWeek = getCurrentWeek();
    const maxWeeks = 2;
    return `${currentWeek}/${maxWeeks}`;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-slate-950' : 'bg-gradient-to-br from-white via-emerald-50/80 to-emerald-100/60'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-sm border-b transition-colors duration-300 ${
        isDark 
          ? 'bg-slate-900/95 border-slate-800' 
          : 'bg-white/95 border-gray-200'
      }`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className={`p-2 rounded-full transition-colors ${
                  isDark 
                    ? 'hover:bg-slate-800 text-white' 
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-purple-400" />
                <h1 className={`text-lg font-bold transition-colors duration-300 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Dream Story</h1>
              </div>
            </div>

            {/* Game Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGameStyle(gameStyle === '2d' ? 'isometric' : '2d')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                {gameStyle === '2d' ? '2D' : '3D'}
              </button>
              
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark 
                    ? 'hover:bg-slate-800 text-white' 
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              
              <button
                onClick={changeGameSpeed}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                {gameState.gameSpeed}x
              </button>
              
              <button
                onClick={togglePause}
                className={`p-2 rounded-lg transition-colors ${
                  isDark 
                    ? 'hover:bg-slate-800 text-white' 
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              
              <button
                onClick={resetGame}
                className={`p-2 rounded-lg transition-colors ${
                  isDark 
                    ? 'hover:bg-slate-800 text-white' 
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Game Stats */}
      <div className={`px-4 py-3 border-b transition-colors duration-300 ${
        isDark ? 'border-slate-800' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className={`text-sm font-medium transition-colors duration-300 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Semana {getWeekProgress()}
            </div>
            <div className={`text-sm transition-colors duration-300 ${
              isDark ? 'text-slate-400' : 'text-gray-600'
            }`}>
              {String(gameState.hour).padStart(2, '0')}:{String(gameState.minute).padStart(2, '0')}
            </div>
          </div>
          <div className={`text-sm transition-colors duration-300 ${
            isDark ? 'text-slate-400' : 'text-gray-600'
          }`}>
            Dia {gameState.day}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Energia', value: gameState.energy, icon: '⚡' },
            { label: 'Sono', value: gameState.sleep, icon: '😴' },
            { label: 'Saúde', value: gameState.health, icon: '❤️' },
            { label: 'Humor', value: gameState.happiness, icon: '😊' }
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-xs mb-1">{stat.icon}</div>
              <div className={`text-xs font-medium mb-1 ${getStatColor(stat.value)}`}>
                {Math.round(stat.value)}
              </div>
              <div className={`h-1 rounded-full transition-colors duration-300 ${
                isDark ? 'bg-slate-800' : 'bg-gray-200'
              }`}>
                <div
                  className={`h-1 rounded-full transition-all duration-300 ${getStatBgColor(stat.value)}`}
                  style={{ width: `${stat.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Room Navigation */}
      <div className={`px-4 py-3 border-b transition-colors duration-300 ${
        isDark ? 'border-slate-800' : 'border-gray-200'
      }`}>
        <div className="flex gap-2 overflow-x-auto">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => changeRoom(room.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                gameState.currentRoom === room.id
                  ? 'bg-purple-500 text-white'
                  : isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              <span>{room.icon}</span>
              <span>{room.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Game Area */}
      <div className="relative h-96 overflow-hidden">
        <div className={`${gameStyle === '2d' ? 'pixel-game-container' : 'isometric-container'} h-full`}>
          <div className={`${gameStyle === '2d' ? 'pixel-room' : 'isometric-room'} h-full relative`}>
            {/* Room Background */}
            <div className={`${gameStyle === '2d' ? 'pixel-room-bg' : ''} room-bg-${gameState.currentRoom} ${gameState.currentRoom === 'bedroom' ? 'room-bedroom' : gameState.currentRoom === 'living' ? 'room-living' : gameState.currentRoom === 'kitchen' ? 'room-kitchen' : gameState.currentRoom === 'gym' ? 'room-gym' : 'room-bathroom'}`} />
            
            {gameStyle === 'isometric' && (
              <>
                <div className="isometric-floor" />
                <div className="isometric-wall-back" />
                <div className="isometric-wall-left" />
                <div className="isometric-wall-right" />
                <div className="isometric-lighting" />
              </>
            )}

            {/* Game Objects */}
            {renderGameObjects()}

            {/* Character */}
            <div className={`${gameStyle === '2d' ? 'pixel-character' : 'isometric-character'}`}>
              <div className={`${gameStyle === '2d' ? 'alex-sprite-2d' : 'alex-sprite-isometric'} alex-${gameState.characterState} ${gameState.characterState === 'idle' ? (gameStyle === '2d' ? 'alex-idle-2d' : 'alex-idle-iso') : ''}`} />
              <div className={`${gameStyle === '2d' ? 'character-shadow-2d' : 'character-shadow'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Log */}
      <div className={`px-4 py-3 border-t transition-colors duration-300 ${
        isDark ? 'border-slate-800' : 'border-gray-200'
      }`}>
        <div className={`text-center text-sm transition-colors duration-300 ${
          isDark ? 'text-slate-400' : 'text-gray-600'
        }`}>
          {gameState.isPaused ? '⏸️ Jogo pausado' : 
           gameState.characterState === 'idle' ? '🎮 Clique nos objetos para interagir' :
           gameState.characterState === 'sleep' ? '😴 Alex está dormindo...' :
           gameState.characterState === 'eat' ? '🍽️ Alex está comendo...' :
           gameState.characterState === 'exercise' ? '💪 Alex está se exercitando...' :
           gameState.characterState === 'relax' ? '😌 Alex está relaxando...' :
           gameState.characterState === 'drinkWater' ? '💧 Alex está bebendo água...' :
           gameState.characterState === 'shower' ? '🚿 Alex está tomando banho...' :
           '🎯 Alex está em ação...'}
        </div>
      </div>
    </div>
  );
};

export default DreamStoryGame;