import React from 'react';

export function Footer() {
  return (
    <footer className="bg-muted text-muted-foreground py-6 mt-auto border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
        DOTS - Distributed Olympiad Testing System &copy; {new Date().getFullYear()}
      </div>
    </footer>
  );
}
