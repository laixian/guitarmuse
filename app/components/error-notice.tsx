'use client'

import { useEffect, useState } from 'react'
import { useAudioStore } from '../store/audio-store'

export const ErrorNotice = () => {
  const { processingError } = useAudioStore()
  const [visible, setVisible] = useState(false)
  
  useEffect(() => {
    if (processingError) {
      setVisible(true)
    }
  }, [processingError])
  
  if (!processingError || !visible) {
    return null
  }
  
  return (
    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm relative">
      <button
        onClick={() => setVisible(false)}
        className="absolute top-2 right-2 text-yellow-500 hover:text-yellow-700"
        aria-label="关闭提示"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      <div className="flex items-start">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
        </svg>
        <span>{processingError}</span>
      </div>
    </div>
  )
} 