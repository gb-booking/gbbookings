import { useEffect, useState, type ReactNode } from 'react';
import { 
  ChevronDown, Globe, User, Bell, Bot, Calendar, Headset, 
  Compass as TourIcon, Compass, Sparkles, MessageCircle, Building2, Home, 
  Car, MapPin, Flame, LogOut, Heart, ShieldCheck, Shield, ChevronRight,
  ArrowRight, ArrowLeft, Tag, Percent, Star, PlusCircle, HelpCircle, MoreVertical,
  Wifi, Coffee, Mountain, Waves, Utensils, Plane, Snowflake,
  LayoutGrid, Crown, Dog, Briefcase, Lock, Users, Building,
  Smartphone, Sun, Landmark, Trees, Flower2, Gift, Zap, Clock, CreditCard,
  Award, Moon, Wallet, Key, Camera, Menu, X, Phone
} from 'lucide-react';
import { handleImageError, type Listing, type ListingType } from '../../types';
import { api } from '../api/api';
import { useListings } from '../hooks/useListings';

export type MegaTab = 'hotels' | 'homestays' | 'cars' | 'tours' | 'destinations' | 'offers';
const CarBrandLogo = ({brand}:{brand:string}) => <span aria-label={brand} className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-100"><Car className="size-3 text-slate-500" /></span>;

// Offers directory — restored verbatim from old Navbar.tsx at 5372888^
// (Featured Deals, Seasonal Offers, Payment Offers, Member Benefits,
// Last Minute, 40% OFF panel). The previous version here showed only
// Featured Deals + live offer cards; the live offers still live on /offers.
function OffersMenu({ setView }: { setView: (view: string) => void }) {
  const column = (title: string, icon: ReactNode, items: Array<{ title: string; desc: string; icon: ReactNode; color?: string; view?: string }>, viewAll: string) => (
    <div className="col-span-2 text-left">
      <h4 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">{icon}<span>{title}</span></h4>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.title} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setView(item.view ?? 'offers'); } }} onClick={() => setView(item.view ?? 'offers')} className="group flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 transition-all hover:bg-slate-50">
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-bold transition-colors group-hover:bg-[#00A651]/10 group-hover:text-[#00A651] ${item.color ?? 'bg-slate-100 text-slate-600'}`}>{item.icon}</div>
            <div>
              <h5 className="text-[12px] font-bold text-slate-900 transition-colors group-hover:text-[#00A651]">{item.title}</h5>
              <p className="text-[10px] leading-tight text-slate-500">{item.desc}</p>
            </div>
          </div>
        ))}
        <div className="border-t border-slate-100 pt-1">
          <button type="button" onClick={() => setView('offers')} className="flex cursor-pointer items-center gap-1 text-[12px] font-bold text-slate-900 hover:text-[#00A651]"><span>{viewAll}</span><ArrowRight className="size-3.5" /></button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="grid grid-cols-12 items-start gap-5">
      {column('Featured Deals', <Gift className="size-3.5 text-[#00A651]" />, [
        { title: 'Hotel Deals', desc: 'Best hotel discounts', icon: <Building2 className="size-4" />, view: 'hotels' },
        { title: 'Homestay Deals', desc: 'Save on homestays', icon: <Home className="size-4" />, view: 'homestays' },
        { title: 'Car Rental Deals', desc: 'Low prices on cars', icon: <Car className="size-4" />, view: 'cars' },
        { title: 'Tour Package Deals', desc: 'Exclusive tour offers', icon: <TourIcon className="size-4" />, view: 'tours' },
      ], 'View All Deals')}
      {column('Seasonal Offers', <Flame className="size-3.5 text-orange-500" />, [
        { title: 'Summer Sale', desc: 'Up to 40% OFF', icon: <Sun className="size-4" />, color: 'bg-orange-50 text-orange-600' },
        { title: 'Winter Sale', desc: 'Up to 40% OFF', icon: <Snowflake className="size-4" />, color: 'bg-orange-50 text-orange-600' },
        { title: 'Eid Special', desc: 'Special discounts', icon: <Moon className="size-4" />, color: 'bg-orange-50 text-orange-600' },
        { title: 'Honeymoon Deals', desc: 'For couples', icon: <Heart className="size-4" />, color: 'bg-orange-50 text-orange-600' },
        { title: 'Family Deals', desc: 'Perfect for families', icon: <Users className="size-4" />, color: 'bg-orange-50 text-orange-600' },
      ], 'View All Seasonal Offers')}
      {column('Payment Offers', <CreditCard className="size-3.5 text-blue-600" />, [
        { title: 'JazzCash Discount', desc: 'Exclusive savings', icon: <Wallet className="size-4" />, color: 'bg-red-50 text-red-600' },
        { title: 'Easypaisa Discount', desc: 'Exclusive savings', icon: <Wallet className="size-4" />, color: 'bg-emerald-50 text-emerald-600' },
        { title: 'Bank Card Offers', desc: 'Save with cards', icon: <CreditCard className="size-4" />, color: 'bg-blue-50 text-blue-600' },
        { title: 'Promo Codes', desc: 'Use code & save more', icon: <Percent className="size-4" />, color: 'bg-purple-50 text-purple-600' },
      ], 'View All Payment Offers')}
      {column('Member Benefits', <Star className="size-3.5 text-amber-500" />, [
        { title: 'Login & Save', desc: 'Extra member discounts', icon: <User className="size-4" />, color: 'bg-amber-50 text-amber-600' },
        { title: 'Referral Rewards', desc: 'Invite & earn', icon: <Gift className="size-4" />, color: 'bg-amber-50 text-amber-600' },
        { title: 'Loyalty Points', desc: 'Earn points & save', icon: <Award className="size-4" />, color: 'bg-amber-50 text-amber-600' },
        { title: 'First Booking Discount', desc: 'Special for new users', icon: <Percent className="size-4" />, color: 'bg-amber-50 text-amber-600' },
      ], 'View All Benefits')}
      {column('Last Minute', <Clock className="size-3.5 text-rose-500" />, [
        { title: 'Flash Deals', desc: 'Limited time offers', icon: <Zap className="size-4" />, color: 'bg-rose-50 text-rose-600' },
        { title: 'Weekend Deals', desc: 'Best weekend offers', icon: <Calendar className="size-4" />, color: 'bg-rose-50 text-rose-600' },
        { title: 'Last Minute Getaways', desc: 'Plan spontaneous trips', icon: <TourIcon className="size-4" />, color: 'bg-rose-50 text-rose-600' },
        { title: 'Early Bird Offers', desc: 'Book early & save more', icon: <Heart className="size-4" />, color: 'bg-rose-50 text-rose-600' },
      ], 'View All Offers')}
      <div className="col-span-2 text-left">
        <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-sky-50 to-blue-100 p-4 text-slate-900 shadow-md">
          <div className="relative z-10 space-y-1">
            <span className="mb-1 inline-block rounded-full bg-emerald-100/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">Limited Time Only</span>
            <p className="text-xs font-semibold text-slate-600">Up to</p>
            <h5 className="text-3xl font-black leading-none tracking-tight text-[#00A651]">40% <span className="text-xl font-extrabold text-slate-800">OFF</span></h5>
            <ul className="space-y-1.5 pt-3 text-[11px] font-bold text-slate-700">
              {[{ label: 'Hotels', icon: Building2, view: 'hotels' }, { label: 'Tours & Packages', icon: TourIcon, view: 'tours' }, { label: 'Cars', icon: Car, view: 'cars' }, { label: 'Homestays', icon: Home, view: 'homestays' }].map(({ label, icon: Icon, view }) => (
                <li key={label}><button type="button" onClick={() => setView(view)} className="flex cursor-pointer items-center gap-2 hover:text-[#00A651]"><Icon className="size-3.5 text-emerald-600" /><span>{label}</span></button></li>
              ))}
            </ul>
          </div>
          <div className="relative z-10 pt-4">
            <button type="button" onClick={() => setView('offers')} className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#00A651] px-3 py-2 text-xs font-extrabold text-white shadow-md transition-all hover:bg-[#008E45]"><span>Explore All Offers</span><ArrowRight className="size-3.5" /></button>
          </div>
          <div className="pointer-events-none absolute -bottom-2 -right-2 size-20 opacity-80">
            <img src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=150&q=80" alt="Special gift deal" className="h-full w-full rounded-xl border border-white object-cover shadow-lg" onError={handleImageError} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NavbarMegaMenu({activeMegaTab,onNavigate,onClose,partnerView,closing,onEnter,onLeave}:{activeMegaTab:MegaTab;onNavigate:(view:string)=>void;onClose:()=>void;partnerView:string;closing:boolean;onEnter:()=>void;onLeave:()=>void}) {
 const type:ListingType=activeMegaTab==='homestays'?'homestay':activeMegaTab==='cars'?'car':activeMegaTab==='tours'?'tour':activeMegaTab==='offers'?'offer':'hotel';
 const {listings,loading,error}=useListings(type,'',{limit:6,sort:'recommended'});
 const [places,setPlaces]=useState<Array<{name:string;count:number;image:string}>>([]);
 useEffect(()=>{let active=true;api.getTopPlaces('all',6).then(items=>{if(active)setPlaces(items);}).catch(()=>undefined);return()=>{active=false;};},[]);
 const items=loading||error?[]:listings;
 const topPicks=items.map(item=>({name:item.title,img:item.image,rating:item.reviewsCount>0?String(item.rating):'New',type:item.location}));
 const topCars=items.map(item=>({name:item.title,img:item.image}));
 const topPackages=items.map(item=>({name:item.title,img:item.image,sub:item.location}));
 const topDestinations=places.map(item=>({name:item.name,img:item.image,sub:item.count+' listings'}));
 const setView=(view:string)=>{onClose();onNavigate(view==='vendor-dashboard'?partnerView:view);};
 const setShowMegaMenu=(open:boolean)=>{if(!open)onClose();};
 return <div id="nav-mega-menu" aria-label={activeMegaTab+' navigation'} data-state={closing?'closing':'open'} className="navbar-mega-menu absolute top-full left-0 right-0 z-40 hidden w-full border-b border-slate-300 bg-white shadow-2xl lg:block" onMouseEnter={onEnter} onMouseLeave={onLeave}>
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-6">
              
              {/* HOMESTAYS MEGA MENU (1:1 Exact Match with Reference Screenshot) */}
              {activeMegaTab === 'homestays' ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-12 gap-5 items-start">
                    
                    {/* Column 1: EXPLORE HOMESTAYS BY DESTINATION */}
                    <div className="col-span-3 text-left">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                        EXPLORE HOMESTAYS BY DESTINATION
                      </h4>
                      <ul className="space-y-1 text-[12px] font-semibold text-slate-700">
                        {[
                          'Homestays in Skardu', 'Homestays in Hunza', 'Homestays in Gilgit', 
                          'Homestays in Shigar', 'Homestays in Khaplu', 'Homestays in Astore', 
                          'Homestays in Nagar', 'Homestays in Ghizer'
                        ].map((item) => (
                          <li key={item}>
                            <button
                              onClick={() => { setView('homestays'); setShowMegaMenu(false); }}
                              className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item}</span>
                            </button>
                          </li>
                        ))}
                        <li className="pt-1 border-t border-slate-100">
                          <button
                            onClick={() => { setView('homestays'); setShowMegaMenu(false); }}
                            className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1.5 cursor-pointer"
                          >
                            <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                            <span>All Homestays</span>
                          </button>
                        </li>
                      </ul>
                    </div>

                    {/* Column 2: BROWSE HOMESTAYS BY TYPE */}
                    <div className="col-span-3 text-left">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                        BROWSE HOMESTAYS BY TYPE
                      </h4>
                      <ul className="space-y-1 text-[12px] font-semibold text-slate-700">
                        {[
                          { name: 'Entire Homes', icon: Home },
                          { name: 'Private Rooms', icon: Key },
                          { name: 'Shared Rooms', icon: Users },
                          { name: 'Family Friendly', icon: Users },
                          { name: 'Couple Friendly', icon: Heart },
                          { name: 'Pet Friendly', icon: Dog },
                          { name: 'Luxury Homestays', icon: Crown },
                          { name: 'Budget Homestays', icon: Percent },
                          { name: 'Traditional Homes', icon: Building },
                          { name: 'Wooden Cabins', icon: Trees },
                          { name: 'Farm Stays', icon: Sun },
                        ].map((item) => (
                          <li key={item.name}>
                            <button
                              onClick={() => { setView('homestays'); setShowMegaMenu(false); }}
                              className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <item.icon className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Column 3: POPULAR AMENITIES */}
                    <div className="col-span-2 text-left">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                        POPULAR AMENITIES
                      </h4>
                      <ul className="space-y-1 text-[12px] font-semibold text-slate-700">
                        {[
                          { name: 'Free WiFi', icon: Wifi },
                          { name: 'Breakfast Included', icon: Coffee },
                          { name: 'Mountain View', icon: Mountain },
                          { name: 'Heating', icon: Snowflake },
                          { name: 'Parking', icon: Car },
                          { name: 'Kitchen', icon: Utensils },
                          { name: 'Bonfire', icon: Flame },
                          { name: '24/7 Power Backup', icon: Zap },
                          { name: 'Hot Water', icon: Waves },
                        ].map((item) => (
                          <li key={item.name}>
                            <button
                              onClick={() => { setView('homestays'); setShowMegaMenu(false); }}
                              className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <item.icon className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Column 4: POPULAR AREAS */}
                    <div className="col-span-2 text-left">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                        POPULAR AREAS
                      </h4>
                      <ul className="space-y-1 text-[12px] font-semibold text-slate-700">
                        {[
                          'Near Kachura Lake', 'Upper Kachura', 'Lower Kachura', 'Skardu City',
                          'Shigar Valley', 'Hussaini', 'Passu', 'Altit', 'Duikar'
                        ].map((area) => (
                          <li key={area}>
                            <button
                              onClick={() => { setView('homestays'); setShowMegaMenu(false); }}
                              className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{area}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Column 5: RIGHT BANNER CARD ("Become a Homestay Host") */}
                    <div className="col-span-2 text-left">
                      <div className="bg-[#071728] rounded-2xl p-4 text-white relative overflow-hidden shadow-lg flex flex-col justify-between h-full min-h-[260px]">
                        <div className="relative z-10 space-y-2">
                          <h5 className="text-base font-extrabold text-white leading-tight">Become a Homestay Host</h5>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            List your homestay and start welcoming travelers.
                          </p>
                        </div>

                        <button
                          onClick={() => { setView('vendor-dashboard'); setShowMegaMenu(false); }}
                          className="relative z-10 bg-[#00A651] hover:bg-[#008E45] text-white text-xs font-bold px-3 py-2 rounded-xl inline-flex items-center justify-center gap-1.5 w-full transition-all cursor-pointer mt-4 shadow-md"
                        >
                          <span>List Your Homestay</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Background image of cozy wooden homestay cabin in mountains */}
                        <img 
                          src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=500&q=80"
                          alt="Wooden cabin homestay in mountains"
                          className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Bottom Trust Pillars Row */}
                  <div className="pt-4 mt-2 border-t border-slate-100 grid grid-cols-4 gap-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#00A651] flex items-center justify-center shrink-0 border border-emerald-100">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h6 className="text-[12px] font-bold text-slate-900 leading-tight">Verified Homestays</h6>
                        <p className="text-[10px] text-slate-500">All homestays are verified for your safety</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#00A651] flex items-center justify-center shrink-0 border border-emerald-100">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h6 className="text-[12px] font-bold text-slate-900 leading-tight">Secure Booking</h6>
                        <p className="text-[10px] text-slate-500">Your data and payments are always safe</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#00A651] flex items-center justify-center shrink-0 border border-emerald-100">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <h6 className="text-[12px] font-bold text-slate-900 leading-tight">Best Price Guarantee</h6>
                        <p className="text-[10px] text-slate-500">Get the best prices with no hidden fees</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#00A651] flex items-center justify-center shrink-0 border border-emerald-100">
                        <Headset className="w-4 h-4" />
                      </div>
                      <div>
                        <h6 className="text-[12px] font-bold text-slate-900 leading-tight">24/7 Support</h6>
                        <p className="text-[10px] text-slate-500">We're always here to help you</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeMegaTab === 'cars' ? (
                <div className="grid grid-cols-12 gap-4 items-start">
                  
                  {/* Left Column 1: EXPLORE BY CITY / DESTINATION */}
                  <div className="col-span-2 text-left border-r border-slate-100 pr-3">
                    <button
                      onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                      className="text-[11px] font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center justify-between w-full hover:text-[#00A651] transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#00A651]" />
                        <span>Explore by city / destination</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <ul className="space-y-1.5 text-[12px] font-semibold text-slate-700">
                      {[
                        'Skardu', 'Hunza Valley', 'Gilgit', 'Shigar Valley', 
                        'Khaplu', 'Astore Valley', 'Naltar Valley', 'Deosai Plains'
                      ].map((loc) => (
                        <li key={loc}>
                          <button
                            onClick={() => { setView('cars'); setShowMegaMenu(false); }}
                            className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span className="text-slate-600 hover:text-[#00A651]">{loc}</span>
                          </button>
                        </li>
                      ))}
                      <li className="pt-1.5 border-t border-slate-100">
                        <button
                          onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                          className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1.5 cursor-pointer"
                        >
                          <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                          <span>All Destinations</span>
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Middle Section: 5 Columns for Cars (col-span-8 grid-cols-5) */}
                  <div className="col-span-8 grid grid-cols-5 gap-3 text-left">
                    
                    {/* Col 1: EXPLORE CARS BY CITY */}
                    <div>
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                        EXPLORE CARS BY CITY
                      </h4>
                      <ul className="space-y-1 text-[12px] font-semibold text-slate-700">
                        {[
                          'Cars in Skardu', 'Cars in Hunza', 'Cars in Gilgit', 'Cars in Shigar',
                          'Cars in Khaplu', 'Cars in Astore', 'Cars in Ghizer', 'Cars in Chilas',
                          'Airport Pickup & Drop'
                        ].map((item) => (
                          <li key={item}>
                            <button
                              onClick={() => { setView('cars'); setShowMegaMenu(false); }}
                              className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item}</span>
                            </button>
                          </li>
                        ))}
                        <li className="pt-1 border-t border-slate-100">
                          <button
                            onClick={() => { setView('cars'); setShowMegaMenu(false); }}
                            className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1.5 cursor-pointer"
                          >
                            <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                            <span>All Cities</span>
                          </button>
                        </li>
                      </ul>
                    </div>

                    {/* Col 2: BROWSE CARS BY TYPE */}
                    <div>
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                        BROWSE CARS BY TYPE
                      </h4>
                      <ul className="space-y-1 text-[12px] font-semibold text-slate-700">
                        {[
                          { name: 'SUVs', icon: Car },
                          { name: 'Vans', icon: Users },
                          { name: '7 Seater', icon: Users },
                          { name: 'Luxury Cars', icon: Crown },
                          { name: 'Economy Cars', icon: Car },
                          { name: 'Sedan Cars', icon: Car },
                          { name: 'Hatchback Cars', icon: Car },
                          { name: '4x4 Jeeps', icon: Mountain },
                          { name: 'Convertibles', icon: Sun },
                          { name: 'Camping Vehicles', icon: Home },
                        ].map((item) => (
                          <li key={item.name}>
                            <button
                              onClick={() => { setView('cars'); setShowMegaMenu(false); }}
                              className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <item.icon className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Col 3: POPULAR BRANDS */}
                    <div>
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                        POPULAR BRANDS
                      </h4>
                      <ul className="space-y-1 text-[12px] font-semibold text-slate-700">
                        {[
                          'Toyota', 'Nissan', 'Honda', 'Suzuki', 'Mitsubishi',
                          'Hyundai', 'KIA', 'Land Rover', 'MG', 'BMW'
                        ].map((brand) => (
                          <li key={brand}>
                            <button
                              onClick={() => { setView('cars'); setShowMegaMenu(false); }}
                              className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <CarBrandLogo brand={brand} />
                              <span className="truncate">{brand}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Col 4: CAR RENTAL & OPTIONS */}
                    <div>
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                        CAR RENTAL & OPTIONS
                      </h4>
                      <ul className="space-y-1 text-[12px] font-semibold text-slate-700">
                        {[
                          { name: 'Self Drive Cars', icon: Key },
                          { name: 'With Driver', icon: User },
                          { name: 'Without Driver', icon: Key },
                          { name: 'Long Term Rentals', icon: Clock },
                          { name: 'Airport Transfers', icon: Plane },
                          { name: 'Hourly Rentals', icon: Clock },
                          { name: 'One Way Rentals', icon: ArrowRight },
                          { name: 'Outstation Rentals', icon: Compass },
                          { name: 'Corporate Rentals', icon: Briefcase },
                          { name: 'Wedding Cars', icon: Heart },
                        ].map((item) => (
                          <li key={item.name}>
                            <button
                              onClick={() => { setView('cars'); setShowMegaMenu(false); }}
                              className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <item.icon className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Col 5: TOP VEHICLES */}
                    <div>
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                        TOP VEHICLES
                      </h4>
                      <div className="space-y-2">
                        {topCars.map((car) => (
                          <div role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }} 
                            key={car.name}
                            onClick={() => { setView('cars'); setShowMegaMenu(false); }}
                            className="flex items-center gap-2.5 cursor-pointer group hover:bg-emerald-50/60 p-1 rounded-lg transition-all"
                          >
                            <img 
                              src={car.img} 
                              alt={car.name} 
                              referrerPolicy="no-referrer"
                              onError={handleImageError}
                              className="w-12 h-9 object-cover rounded-md shrink-0 border border-slate-200/90 shadow-2xs group-hover:border-[#00A651]/40 transition-colors" 
                            />
                            <h5 className="text-[11px] font-bold text-slate-900 group-hover:text-[#00A651] truncate">{car.name}</h5>
                          </div>
                        ))}
                        <div className="pt-1">
                          <button
                            onClick={() => { setView('cars'); setShowMegaMenu(false); }}
                            className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1 cursor-pointer"
                          >
                            <span>View All Cars</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Column Banner Card: RENT THE PERFECT CAR */}
                  <div className="col-span-2 text-left">
                    <div className="bg-[#071728] rounded-2xl p-4 text-white relative overflow-hidden shadow-lg flex flex-col justify-between h-full min-h-[260px]">
                      <div className="relative z-10 space-y-2">
                        <h5 className="text-base font-extrabold text-white leading-tight">Rent the Perfect Car</h5>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Choose from a wide range of cars for every journey and adventure.
                        </p>
                      </div>

                      <button
                        onClick={() => { setView('vendor-dashboard'); setShowMegaMenu(false); }}
                        className="relative z-10 bg-[#00A651] hover:bg-[#008E45] text-white text-xs font-bold px-3 py-2 rounded-xl inline-flex items-center justify-center gap-1.5 w-full transition-all cursor-pointer mt-4 shadow-md"
                      >
                        <span>List Your Car</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Background image of Prado / SUV driving on mountain road */}
                      <img 
                        src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=500&q=80"
                        alt="SUV driving in mountains"
                        className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
                      />
                    </div>
                  </div>

                </div>
              ) : activeMegaTab === 'offers' ? (<OffersMenu setView={setView} />) : activeMegaTab === 'destinations' ? (
                <div className="grid grid-cols-12 gap-5 items-start">
                  
                  {/* Column 1: EXPLORE BY REGION */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      EXPLORE BY REGION
                    </h4>
                    <ul className="space-y-1.5 text-[12px] font-semibold text-slate-700">
                      {[
                        'Skardu', 'Hunza Valley', 'Gilgit', 'Diamer', 'Astore Valley', 
                        'Shigar Valley', 'Khaplu Valley', 'Ghizer Valley', 'Nagar Valley'
                      ].map((region) => (
                        <li key={region}>
                          <button
                            onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                            className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{region}</span>
                          </button>
                        </li>
                      ))}
                      <li className="pt-1.5 border-t border-slate-100">
                        <button
                          onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                          className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1.5 cursor-pointer"
                        >
                          <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                          <span>All Regions</span>
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Column 2: TOP DESTINATIONS */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      TOP DESTINATIONS
                    </h4>
                    <div className="space-y-2.5">
                      {topDestinations.map((dest) => (
                        <div role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }} 
                          key={dest.name}
                          onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                          className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1 rounded-lg transition-all"
                        >
                          <img 
                            src={dest.img} 
                            alt={dest.name} 
                            className="w-12 h-10 object-cover rounded-md shrink-0 border border-slate-200" 
                          />
                          <div className="overflow-hidden">
                            <h5 className="text-[12px] font-bold text-slate-900 group-hover:text-[#00A651] truncate">{dest.name}</h5>
                            <p className="text-[10px] text-slate-500 truncate">{dest.sub}</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-1">
                        <button
                          onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                          className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1 cursor-pointer"
                        >
                          <span>View All Destinations</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: EXPLORE BY THEME */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      EXPLORE BY THEME
                    </h4>
                    <ul className="space-y-1.5 text-[12px] font-semibold text-slate-700">
                      {[
                        { name: 'Lakes & Waterfalls', icon: Waves },
                        { name: 'Mountains & Peaks', icon: Mountain },
                        { name: 'Valleys', icon: Trees },
                        { name: 'Historic Places', icon: Landmark },
                        { name: 'Adventure Spots', icon: TourIcon },
                        { name: 'Religious Sites', icon: Sparkles },
                        { name: 'Glaciers', icon: Snowflake },
                        { name: 'Deserts', icon: Sun },
                        { name: 'National Parks', icon: Trees },
                      ].map((theme) => (
                        <li key={theme.name}>
                          <button
                            onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                            className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <theme.icon className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{theme.name}</span>
                          </button>
                        </li>
                      ))}
                      <li className="pt-1.5 border-t border-slate-100">
                        <button
                          onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                          className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>View All Themes</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Column 4: POPULAR ATTRACTIONS */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      POPULAR ATTRACTIONS
                    </h4>
                    <div className="space-y-2.5">
                      {[
                        { name: 'Passu Cones', sub: 'Hunza', img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=120&q=80' },
                        { name: 'Hussaini Suspension Bridge', sub: 'Hunza', img: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=120&q=80' },
                        { name: 'Khunjerab Pass', sub: 'Hunza', img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=120&q=80' },
                        { name: 'Shigar Fort', sub: 'Shigar', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=120&q=80' },
                        { name: 'Baltit Fort', sub: 'Hunza', img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=120&q=80' },
                        { name: 'Naltar Valley', sub: 'Gilgit', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=120&q=80' },
                      ].map((item) => (
                        <div role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }} 
                          key={item.name}
                          onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                          className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1 rounded-lg transition-all"
                        >
                          <img 
                            src={item.img} 
                            alt={item.name} 
                            className="w-12 h-10 object-cover rounded-md shrink-0 border border-slate-200" 
                          />
                          <div className="overflow-hidden">
                            <h5 className="text-[12px] font-bold text-slate-900 group-hover:text-[#00A651] truncate">{item.name}</h5>
                            <p className="text-[10px] text-slate-500 truncate">{item.sub}</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-1">
                        <button
                          onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                          className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1 cursor-pointer"
                        >
                          <span>View All Attractions</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Column 5: SEASONAL DESTINATIONS & AI PLANNER CARD */}
                  <div className="col-span-4 text-left grid grid-cols-2 gap-4 items-stretch">
                    
                    {/* Left: Seasonal Destinations */}
                    <div>
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                        SEASONAL DESTINATIONS
                      </h4>
                      <ul className="space-y-3 text-[12px] font-semibold text-slate-700">
                        <li>
                          <button 
                            onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                            className="w-full text-left hover:text-[#00A651] transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-1.5 font-bold text-amber-600 group-hover:text-[#00A651]">
                              <Sun className="w-3.5 h-3.5 shrink-0" />
                              <span>Summer Destinations</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-normal ml-5 block">(May – August)</span>
                          </button>
                        </li>
                        <li>
                          <button 
                            onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                            className="w-full text-left hover:text-[#00A651] transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-1.5 font-bold text-orange-600 group-hover:text-[#00A651]">
                              <Flame className="w-3.5 h-3.5 shrink-0" />
                              <span>Autumn Destinations</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-normal ml-5 block">(September – November)</span>
                          </button>
                        </li>
                        <li>
                          <button 
                            onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                            className="w-full text-left hover:text-[#00A651] transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-1.5 font-bold text-sky-600 group-hover:text-[#00A651]">
                              <Snowflake className="w-3.5 h-3.5 shrink-0" />
                              <span>Winter Destinations</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-normal ml-5 block">(December – February)</span>
                          </button>
                        </li>
                        <li>
                          <button 
                            onClick={() => { setView('destinations'); setShowMegaMenu(false); }}
                            className="w-full text-left hover:text-[#00A651] transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-1.5 font-bold text-rose-500 group-hover:text-[#00A651]">
                              <Flower2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Spring Destinations</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-normal ml-5 block">(March – April)</span>
                          </button>
                        </li>
                      </ul>
                    </div>

                    {/* Right Banner Card: AI Planner */}
                    <div className="bg-[#071728] rounded-2xl p-4 text-white relative overflow-hidden shadow-lg flex flex-col justify-between min-h-[220px]">
                      <div className="relative z-10 space-y-1.5">
                        <h5 className="text-sm font-extrabold text-white leading-tight">
                          Not sure where to go?
                        </h5>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Let our AI Planner plan the perfect trip for you.
                        </p>
                      </div>

                      <button
                        onClick={() => { setView('ai-planner'); setShowMegaMenu(false); }}
                        className="relative z-10 bg-[#00A651] hover:bg-[#008E45] text-white text-xs font-extrabold px-3 py-2 rounded-xl inline-flex items-center justify-center gap-1.5 w-full transition-all shadow-md cursor-pointer mt-3"
                      >
                        <span>Plan My Trip</span>
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>

                      {/* Background image of alpine lake & mountain cabin */}
                      <img 
                        src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80"
                        alt="AI trip planner destination"
                        className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
                      />
                    </div>

                  </div>

                </div>
              ) : activeMegaTab === 'tours' ? (
                <div className="grid grid-cols-12 gap-5 items-start">
                  
                  {/* Column 1: EXPLORE TOURS BY REGION */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      EXPLORE TOURS BY REGION
                    </h4>
                    <ul className="space-y-1.5 text-[12px] font-semibold text-slate-700">
                      {[
                        'Skardu Tours', 'Hunza Tours', 'Gilgit Tours', 'Astore Tours', 'Shigar Tours',
                        'Khaplu Tours', 'Naltar Tours', 'Fairy Meadows Tours', 'Nanga Parbat Tours', 'Khunjerab Pass Tours'
                      ].map((region) => (
                        <li key={region}>
                          <button
                            onClick={() => { setView('tours'); setShowMegaMenu(false); }}
                            className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{region}</span>
                          </button>
                        </li>
                      ))}
                      <li className="pt-1.5 border-t border-slate-100">
                        <button
                          onClick={() => { setView('tours'); setShowMegaMenu(false); }}
                          className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1.5 cursor-pointer"
                        >
                          <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                          <span>All Tours</span>
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Column 2: TOUR PACKAGES BY DURATION */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      TOUR PACKAGES BY DURATION
                    </h4>
                    <ul className="space-y-1.5 text-[12px] font-semibold text-slate-700">
                      {[
                        '1–2 Days Trips', '3 Days Packages', '4 Days Packages', '5 Days Packages',
                        '6 Days Packages', '7 Days Packages', '8–10 Days Packages', '10+ Days Packages'
                      ].map((duration) => (
                        <li key={duration}>
                          <button
                            onClick={() => { setView('tours'); setShowMegaMenu(false); }}
                            className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{duration}</span>
                          </button>
                        </li>
                      ))}
                      <li className="pt-2 border-t border-slate-100">
                        <button
                          onClick={() => { setView('tours'); setShowMegaMenu(false); }}
                          className="w-full text-left py-1 text-[12px] font-extrabold text-[#00A651] bg-[#00A651]/10 px-2 py-1 rounded-md hover:bg-[#00A651]/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#00A651] shrink-0" />
                          <span>Custom Tour (Tailor Made)</span>
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Column 3: TOUR TYPES */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      TOUR TYPES
                    </h4>
                    <ul className="space-y-1.5 text-[12px] font-semibold text-slate-700">
                      {[
                        { name: 'Family Tours', icon: Users },
                        { name: 'Couple / Honeymoon Tours', icon: Heart },
                        { name: 'Adventure Tours', icon: TourIcon },
                        { name: 'Luxury Tours', icon: Crown },
                        { name: 'Group Tours', icon: Users },
                        { name: 'Student Tours', icon: Briefcase },
                        { name: 'Photography Tours', icon: Camera },
                        { name: 'Trekking Tours', icon: Mountain },
                        { name: 'Camping Tours', icon: Home },
                        { name: 'Jeep Safari Tours', icon: Car },
                        { name: 'Religious Tours', icon: Sparkles },
                      ].map((item) => (
                        <li key={item.name}>
                          <button
                            onClick={() => { setView('tours'); setShowMegaMenu(false); }}
                            className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <item.icon className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Column 4: POPULAR PACKAGES */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      POPULAR PACKAGES
                    </h4>
                    <div className="space-y-2.5">
                      {topPackages.map((pkg) => (
                        <div role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }} 
                          key={pkg.name}
                          onClick={() => { setView('tours'); setShowMegaMenu(false); }}
                          className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1 rounded-lg transition-all"
                        >
                          <img 
                            src={pkg.img} 
                            alt={pkg.name} 
                            className="w-12 h-10 object-cover rounded-md shrink-0 border border-slate-200" 
                          />
                          <div className="overflow-hidden">
                            <h5 className="text-[12px] font-bold text-slate-900 group-hover:text-[#00A651] truncate">{pkg.name}</h5>
                            <p className="text-[10px] text-slate-500 truncate">{pkg.sub}</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-1">
                        <button
                          onClick={() => { setView('tours'); setShowMegaMenu(false); }}
                          className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1 cursor-pointer"
                        >
                          <span>View All Packages</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Column 5: RIGHT BANNER CARD FOR TOURS */}
                  <div className="col-span-4 text-left">
                    <div className="bg-[#071728] rounded-2xl p-5 text-white relative overflow-hidden shadow-lg flex flex-col justify-between h-full min-h-[260px]">
                      <div className="relative z-10 space-y-2 max-w-xs">
                        <h5 className="text-lg font-extrabold text-white leading-tight">
                          Unforgettable Journeys
                          <br />
                          <span className="text-emerald-400">Memories for a Lifetime</span>
                        </h5>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Explore the most beautiful places in Gilgit Baltistan with our best tour packages.
                        </p>
                      </div>

                      <button
                        onClick={() => { setView('tours'); setShowMegaMenu(false); }}
                        className="relative z-10 bg-[#00A651] hover:bg-[#008E45] text-white text-xs font-bold px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 w-fit transition-all cursor-pointer mt-4 shadow-md"
                      >
                        <span>Explore Packages</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Background image of travelers hiking in mountains */}
                      <img 
                        src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=500&q=80"
                        alt="Tour travelers in Gilgit Baltistan"
                        className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
                      />
                    </div>
                  </div>

                </div>
              ) : (
                /* HOTELS & OTHER SERVICES MEGA MENU */
                <div className="grid grid-cols-12 gap-5 items-start">
                  
                  {/* Column 1: EXPLORE HOTELS BY CITY */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      EXPLORE HOTELS BY CITY
                    </h4>
                    <ul className="space-y-1.5 text-[12px] font-semibold text-slate-700">
                      {[
                        'Skardu', 'Hunza', 'Gilgit', 'Shigar', 'Khaplu', 
                        'Astore', 'Nagar', 'Ghizer', 'Chilas', 'Naltar', 'Fairy Meadows'
                      ].map((city) => (
                        <li key={city}>
                          <button
                            onClick={() => { setView('hotels'); setShowMegaMenu(false); }}
                            className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Hotels in {city}</span>
                          </button>
                        </li>
                      ))}
                      <li className="pt-1.5 border-t border-slate-100">
                        <button
                          onClick={() => { setView('hotels'); setShowMegaMenu(false); }}
                          className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1.5 cursor-pointer"
                        >
                          <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                          <span>All Hotels</span>
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Column 2: BROWSE HOTELS BY TYPE */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      BROWSE HOTELS BY TYPE
                    </h4>
                    <ul className="space-y-1.5 text-[12px] font-semibold text-slate-700">
                      {[
                        { name: 'Luxury Hotels', icon: Crown },
                        { name: '5 Star Hotels', icon: Star },
                        { name: '4 Star Hotels', icon: Star },
                        { name: '3 Star Hotels', icon: Star },
                        { name: 'Budget Hotels', icon: Building },
                        { name: 'Boutique Hotels', icon: Building2 },
                        { name: 'Family Hotels', icon: Users },
                        { name: 'Couple Friendly Hotels', icon: Heart },
                        { name: 'Pet Friendly Hotels', icon: Dog },
                        { name: 'Business Hotels', icon: Briefcase },
                        { name: 'Resort Hotels', icon: Mountain },
                      ].map((item) => (
                        <li key={item.name}>
                          <button
                            onClick={() => { setView('hotels'); setShowMegaMenu(false); }}
                            className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <item.icon className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.name}</span>
                          </button>
                        </li>
                      ))}
                      <li className="pt-1.5 border-t border-slate-100">
                        <button
                          onClick={() => { setView('hotels'); setShowMegaMenu(false); }}
                          className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1.5 cursor-pointer"
                        >
                          <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                          <span>All Hotel Types</span>
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Column 3: POPULAR AMENITIES */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      POPULAR AMENITIES
                    </h4>
                    <ul className="space-y-1.5 text-[12px] font-semibold text-slate-700">
                      {[
                        { name: 'Free WiFi', icon: Wifi },
                        { name: 'Breakfast Included', icon: Coffee },
                        { name: 'Mountain View', icon: Mountain },
                        { name: 'Lake View', icon: Waves },
                        { name: 'Parking', icon: Car },
                        { name: 'Room Service', icon: Bell },
                        { name: 'Restaurant', icon: Utensils },
                        { name: 'Airport Transfer', icon: Plane },
                        { name: 'Air Conditioning', icon: Snowflake },
                        { name: 'Heating', icon: Flame },
                      ].map((item) => (
                        <li key={item.name}>
                          <button
                            onClick={() => { setView('hotels'); setShowMegaMenu(false); }}
                            className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <item.icon className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.name}</span>
                          </button>
                        </li>
                      ))}
                      <li className="pt-1.5 border-t border-slate-100">
                        <button
                          onClick={() => { setView('hotels'); setShowMegaMenu(false); }}
                          className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1.5 cursor-pointer"
                        >
                          <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                          <span>All Amenities</span>
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Column 4: POPULAR AREAS */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      POPULAR AREAS
                    </h4>
                    <ul className="space-y-1.5 text-[12px] font-semibold text-slate-700">
                      {[
                        'Upper Kachura', 'Lower Kachura', 'Skardu City', 'Shigar Valley', 
                        'Hunza Valley', 'Attabad Lake', 'Naltar Valley', 'Khaplu City', 
                        'Basho Valley', 'Deosai Plains'
                      ].map((area) => (
                        <li key={area}>
                          <button
                            onClick={() => { setView('hotels'); setShowMegaMenu(false); }}
                            className="w-full text-left py-0.5 hover:text-[#00A651] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{area}</span>
                          </button>
                        </li>
                      ))}
                      <li className="pt-2">
                        <button
                          onClick={() => { setView('hotels'); setShowMegaMenu(false); }}
                          className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1 cursor-pointer"
                        >
                          <span>View All Areas</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Column 5: TOP PICKS */}
                  <div className="col-span-2 text-left">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                      TOP PICKS
                    </h4>
                    <div className="space-y-2.5">
                      {topPicks.map((pick) => (
                        <div role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }} 
                          key={pick.name}
                          onClick={() => { setView('hotels'); setShowMegaMenu(false); }}
                          className="flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1 rounded-lg transition-all"
                        >
                          <img 
                            src={pick.img} 
                            alt={pick.name} 
                            className="w-12 h-10 object-cover rounded-md shrink-0 border border-slate-200" 
                          />
                          <div className="overflow-hidden">
                            <h5 className="text-[12px] font-bold text-slate-900 group-hover:text-[#00A651] truncate">{pick.name}</h5>
                            <p className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                              <span>★</span>
                              <span>{pick.rating}</span>
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{pick.type}</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-1">
                        <button
                          onClick={() => { setView('hotels'); setShowMegaMenu(false); }}
                          className="text-[12px] font-bold text-slate-900 hover:text-[#00A651] flex items-center gap-1 cursor-pointer"
                        >
                          <span>View All Hotels</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Column 6: RIGHT BANNER CARD FOR HOTELS */}
                  <div className="col-span-2 text-left">
                    <div className="bg-[#071728] rounded-2xl p-4 text-white relative overflow-hidden shadow-lg flex flex-col justify-between h-full min-h-[260px]">
                      <div className="relative z-10 space-y-2">
                        <h5 className="text-base font-extrabold text-white leading-tight">List Your Hotel</h5>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Grow your business and reach thousands of travelers.
                        </p>
                      </div>

                      <button
                        onClick={() => { setView('vendor-dashboard'); setShowMegaMenu(false); }}
                        className="relative z-10 bg-[#00A651] hover:bg-[#008E45] text-white text-xs font-bold px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 w-fit transition-all cursor-pointer mt-4 shadow-md"
                      >
                        <span>List Your Hotel</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Background image of luxury hotel balcony */}
                      <img 
                        src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80"
                        alt="Balcony hotel view"
                        className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* BOTTOM TRUST PILLARS ROW (5 Cards with subtle borders matching screenshot) */}
              <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-5 gap-3">
                
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-full bg-[#00A651]/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-[#00A651]" />
                  </div>
                  <div>
                    <h6 className="text-[11px] font-bold text-slate-900 leading-tight">Best Price Guarantee</h6>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Get the best prices with no hidden fees</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-full bg-[#00A651]/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-[#00A651]" />
                  </div>
                  <div>
                    <h6 className="text-[11px] font-bold text-slate-900 leading-tight">Free Cancellation</h6>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Cancel up to 24 hours before your trip</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-full bg-[#00A651]/10 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-[#00A651]" />
                  </div>
                  <div>
                    <h6 className="text-[11px] font-bold text-slate-900 leading-tight">Secure Booking</h6>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Your data and payments are always safe</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-full bg-[#00A651]/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[#00A651]" />
                  </div>
                  <div>
                    <h6 className="text-[11px] font-bold text-slate-900 leading-tight">Trusted by Travelers</h6>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Thousands of happy travelers</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-full bg-[#00A651]/10 flex items-center justify-center shrink-0">
                    <Headset className="w-4 h-4 text-[#00A651]" />
                  </div>
                  <div>
                    <h6 className="text-[11px] font-bold text-slate-900 leading-tight">24/7 Support</h6>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">We're always here to help you</p>
                  </div>
                </div>

              </div>

            </div>
          
 </div>;
}
