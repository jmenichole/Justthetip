import React, { useState, useEffect } from 'react';

// Define the structure for our crypto data
interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
}

const coinList = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu' },
];

export const CryptoTicker: React.FC = () => {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ids = coinList.map(coin => coin.id).join(',');
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        if (!response.ok) {
          throw new Error('Failed to fetch crypto data');
        }
        const data = await response.json();
        
        const formattedData: CryptoData[] = coinList.map(coin => ({
          ...coin,
          price: data[coin.id]?.usd || 0,
          change: data[coin.id]?.usd_24h_change || 0,
        }));
        
        setCryptoData(formattedData);
      } catch (error) {
        console.error("Error fetching crypto prices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading && cryptoData.length === 0) {
    return (
        <div className="py-3 text-center text-gray-500 text-sm">Loading market data...</div>
    );
  }
  
  if (cryptoData.length === 0) {
      return null; // Don't render if there's no data or an error occurred
  }

  const TickerItem: React.FC<{ item: CryptoData }> = ({ item }) => {
    const isPositive = item.change >= 0;
    const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
    const changeSymbol = isPositive ? '▲' : '▼';

    return (
      <div className="flex items-center gap-4 mx-6 flex-shrink-0">
        <span className="font-bold text-white">{item.symbol}</span>
        <span className="text-gray-300">${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className={`${changeColor} flex items-center gap-1`}>
          <span>{changeSymbol}</span>
          <span>{Math.abs(item.change).toFixed(2)}%</span>
        </span>
      </div>
    );
  };

  const tickerContent = cryptoData.map(item => <TickerItem key={item.id} item={item} />);

  return (
    <section className="mb-24 w-full">
        <div className="relative w-full py-4 bg-brand-card/50 border-y border-white/10 overflow-hidden backdrop-blur-sm">
            <div className="flex animate-marquee hover:[animation-play-state:paused]">
                <div className="flex">{tickerContent}</div>
                <div className="flex" aria-hidden="true">{tickerContent}</div>
            </div>
        </div>
    </section>
  );
};