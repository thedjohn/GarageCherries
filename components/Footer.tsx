import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-zinc-900 text-zinc-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🍒</span>
              <span className="text-white font-bold">Garage<span className="text-red-500">Cherries</span></span>
            </div>
            <p className="text-sm leading-relaxed">The premier marketplace for classic, muscle, and collector cars. Buy, sell, and discover automotive history.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Browse</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/listings" className="hover:text-white transition-colors">All Listings</Link></li>
              <li><Link href="/dealers" className="hover:text-white transition-colors">Find a Dealer</Link></li>
              <li><Link href="/listings?condition=Excellent" className="hover:text-white transition-colors">Collector Cars</Link></li>
              <li><Link href="/listings?bodyStyle=Convertible" className="hover:text-white transition-colors">Convertibles</Link></li>
              <li><Link href="/listings?bodyStyle=Pickup+Truck" className="hover:text-white transition-colors">Classic Trucks</Link></li>
              <li><Link href="/listings?bodyStyle=Coupe" className="hover:text-white transition-colors">Coupes</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Sell</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/sell" className="hover:text-white transition-colors">Post a Listing</Link></li>
              <li><Link href="/sell" className="hover:text-white transition-colors">Pricing Guide</Link></li>
              <li><Link href="/sell" className="hover:text-white transition-colors">Seller Tips</Link></li>
              <li><Link href="/sell" className="hover:text-white transition-colors">Dealer Accounts</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs">
          <p>© {new Date().getFullYear()} GarageCherries. All rights reserved.</p>
          <p>The #1 classic car marketplace</p>
        </div>
      </div>
    </footer>
  );
}
