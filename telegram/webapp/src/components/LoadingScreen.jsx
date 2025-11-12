export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-telegram-bg">
      <div className="text-center">
        <div className="inline-block mb-4">
          <div className="w-16 h-16 border-4 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-bold gradient-text">JustTheTip</h2>
        <p className="text-telegram-hint mt-2">Loading...</p>
      </div>
    </div>
  );
}
