import React from 'react'
import FavoritesPanel from '@/components/FavoritesPanel'

const FavoritesPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Favorites</h1>
        <p className="text-muted-foreground">
          Manage your saved papers, organize them into collections, and export your research library.
        </p>
      </div>

      <FavoritesPanel className="w-full" />
    </div>
  )
}

export default FavoritesPage