import React, { useState } from 'react';
import { X, ShoppingCart, Loader2, Zap, Gift } from 'lucide-react';
import { UserProfile } from '../types';
import { redeemPromoCode, addUserCredits, initializePromoCodes } from '../services/userService';
import { useAuth } from '../services/AuthContext';
import { createCheckoutSession } from '../services/stripeService';

// Simulated packages for MVP
// REPLACE 'price_...' WITH YOUR ACTUAL STRIPE PRICE IDs FROM STRIPE DASHBOARD
export const CREDIT_PACKAGES = [
  { id: 'starter', name: 'STARTER PACK', credits: 100, price: '4.99€', priceId: 'price_1SjNhDH429pxTITD4M40Pdu2', color: 'border-green-800 bg-green-900/10' },
  { id: 'pro', name: 'PRO PACK', credits: 500, price: '19.99€', priceId: 'price_1SjNhthH429pxTITDks4TRbzI', color: 'border-blue-800 bg-blue-900/10', popular: true },
  { id: 'elite', name: 'ELITE PACK', credits: 2000, price: '49.99€', priceId: 'price_1SjNiaH429pxTITDi5UQqfIn', color: 'border-yellow-800 bg-yellow-900/10' },
];

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  // userProfile and currentCredits now come from context
}

const StoreModal: React.FC<StoreModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const currentCredits = userProfile?.stats?.availableCredits || 0;

  const [promoCode, setPromoCode] = useState('');
  const [redeemStatus, setRedeemStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isBuying, setIsBuying] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRedeem = async () => {
    if (!userProfile) {
      setRedeemStatus({ type: 'error', message: 'Please Login to redeem codes.' });
      return;
    }
    if (!promoCode.trim()) return;

    setIsRedeeming(true);
    setRedeemStatus({ type: null, message: '' });

    try {
      const result = await redeemPromoCode(userProfile.uid, promoCode);
      if (result.success) {
        setRedeemStatus({ type: 'success', message: result.message });
        setRedeemStatus({ type: 'success', message: result.message });
        await refreshProfile();
        setPromoCode('');
      } else {
        setRedeemStatus({ type: 'error', message: result.message });
      }
    } catch (error) {
      setRedeemStatus({ type: 'error', message: 'Redemption Failed.' });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleBuy = async (pkg: typeof CREDIT_PACKAGES[0]) => {
    const uid = userProfile?.uid;
    const stripeId = userProfile?.stripeId;

    if (!uid) {
      setRedeemStatus({ type: 'error', message: 'Login required to purchase.' });
      return;
    }

    // Explicitly allow purchase even if stripeId is missing.
    // The Extension handles customer creation automatically during the checkout session creation.
    console.log(`Initiating purchase for ${pkg.id} (PriceID: ${pkg.priceId}). User: ${uid}, StripeID: ${stripeId || 'Auto-generated'}`);

    setIsBuying(pkg.id);

    try {
      // Initiate Stripe Checkout
      // The extension will write the redirect URL to Firestore, service listens and redirects
      await createCheckoutSession(uid, pkg.priceId);
    } catch (error: any) {
      console.error("Payment Error", error);
      // Show the actual error message to debugging (e.g., "Missing permissions", "Timeout")
      setRedeemStatus({
        type: 'error',
        message: error.message || "Stripe Connection Failed. Check console."
      });
      setIsBuying(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-black border border-red-900/50 shadow-[0_0_50px_rgba(220,38,38,0.2)] flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-red-900/30 bg-red-950/10">
          <h2 className="text-xl font-display font-bold text-red-500 tracking-widest flex items-center gap-3">
            <ShoppingCart size={24} /> SUPPLY DEPOT
          </h2>
          <button onClick={onClose} className="text-red-500 hover:text-white transition-colors flex items-center gap-2 font-bold text-xs">
            <span>QUITTER LE DÉPÔT</span>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 font-mono">

          {/* Current Balance */}
          <div className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
            <span className="text-gray-400 uppercase tracking-widest">Available Power</span>
            <div className="flex items-center gap-2">
              <Zap className="text-yellow-500" fill="currentColor" />
              <span className="text-2xl font-bold text-white">{currentCredits}</span>
            </div>
          </div>

          {/* Packages */}
          <div className="relative">
            <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4">Select Package</h3>

            {/* Login Overlay if not authenticated or ANONYMOUS */}
            {(!userProfile || user?.isAnonymous) && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-[2px] border border-red-900/50 rounded-lg">
                <p className="text-red-400 font-bold mb-3 tracking-widest uppercase text-center px-4">IDENTIFICATION REQUISE</p>
                <button
                  onClick={onClose} // Close store to let them use the main auth button
                  className="px-6 py-2 bg-red-900/30 border border-red-500 text-red-400 hover:text-white hover:bg-red-800/50 uppercase tracking-widest font-bold text-xs transition-all"
                >
                  SE CONNECTER POUR ACHETER
                </button>
              </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${(!userProfile || user?.isAnonymous) ? 'opacity-25 pointer-events-none filter grayscale' : ''}`}>
              {CREDIT_PACKAGES.map(pkg => (
                <div key={pkg.id} className={`relative p-4 border ${pkg.color} rounded-lg flex flex-col items-center gap-3 hover:scale-105 transition-transform cursor-pointer`}>
                  {pkg.popular && (
                    <span className="absolute -top-3 bg-red-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-widest">
                      Best Value
                    </span>
                  )}
                  <div className="text-lg font-bold text-gray-300">{pkg.name}</div>
                  <div className="text-3xl font-bold text-white flex items-center gap-1">
                    {pkg.credits} <Zap size={16} className="text-yellow-500" fill="currentColor" />
                  </div>
                  <button
                    onClick={() => handleBuy(pkg)}
                    disabled={!!isBuying}
                    className="w-full mt-2 py-2 bg-white/10 hover:bg-white/20 text-white font-bold border border-white/20 rounded transition-colors flex items-center justify-center gap-2"
                  >
                    {isBuying === pkg.id ? <Loader2 size={16} className="animate-spin" /> : pkg.price}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Promo Code */}
          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Gift size={16} /> Access Code (Promo)
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="ENTER CODE..."
                className="flex-1 bg-black border border-gray-700 text-white px-4 py-2 font-mono focus:border-green-500 focus:outline-none uppercase"
              />
              <button
                onClick={handleRedeem}
                disabled={isRedeeming || !promoCode}
                className="bg-green-700 hover:bg-green-600 text-white px-6 font-bold tracking-wider disabled:opacity-50 transition-colors"
              >
                {isRedeeming ? <Loader2 className="animate-spin" /> : 'REDEEM'}
              </button>
            </div>
            {redeemStatus.message && (
              <div className={`mt-2 text-xs font-bold ${redeemStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {redeemStatus.type === 'success' ? '✅' : '❌'} {redeemStatus.message}
              </div>
            )}
            {promoCode === 'ADMIN_INIT' && (
              <div className="mt-4 pt-4 border-t border-red-900/30">
                <button
                  onClick={async () => {
                    try {
                      setIsRedeeming(true);
                      await initializePromoCodes();
                      alert("✅ Database Initialized: Promo Codes");
                    } catch (error: any) {
                      console.error("Initialization Failed", error);
                      alert(`❌ Initialization Failed: ${error.message}`);
                    } finally {
                      setIsRedeeming(false);
                    }
                  }}
                  className="w-full py-2 bg-red-900/20 border border-red-500 text-red-500 font-bold hover:bg-red-900/40"
                >
                  ⚠️ ADMIN: INITIALIZE PROMOS ⚠️
                </button>
              </div>
            )}
          </div>

          {/* Discord Banner */}
          <div className="mt-8 p-4 border border-blue-900/30 bg-blue-950/20 rounded flex flex-col items-center gap-2 text-center">
            <p className="text-blue-300 text-xs">
              Les membres du Discord reçoivent des <span className="text-blue-400 font-bold">codes promos exclusifs</span>.
            </p>
            <a
              href="https://discord.gg/NX3zcSR7"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-200 text-xs font-bold underline flex items-center gap-2"
            >
              Rejoindre la résistance sur Discord
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StoreModal;