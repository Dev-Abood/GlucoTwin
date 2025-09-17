import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, AlertCircle, Zap, TrendingUp, Minus } from "lucide-react"
import { AlertStatus } from "./glucose-monitoring"

interface DetailedAlertBadgeProps {
  alert: AlertStatus
  label: string
  type: 'hyperglycemia' | 'hyperglycemiaFrequent' | 'hyperglycemiaMajor' | 'hypoglycemia' | 'hypoglycemiaFrequent' | 'hypoglycemiaMajor'
}

export function DetailedAlertBadge({ alert, label, type }: DetailedAlertBadgeProps) {
  if (!alert.hasAlert) {
    return (
      <div className="flex items-center justify-center">
        <Minus className="w-3 h-3 text-gray-400" />
      </div>
    )
  }

  const getIcon = () => {
    switch (alert.severity) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />
      case 'danger':
        return <AlertCircle className="w-4 h-4" />
      case 'critical':
        return <Zap className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getBadgeStyle = () => {
    switch (alert.severity) {
      case 'warning':
        return "text-yellow-700 border-yellow-300 bg-yellow-100 hover:bg-yellow-200"
      case 'danger':
        return "text-orange-700 border-orange-300 bg-orange-100 hover:bg-orange-200"
      case 'critical':
        return "text-red-700 border-red-300 bg-red-100 hover:bg-red-200"
      default:
        return "text-gray-700 border-gray-300 bg-gray-100"
    }
  }

  const getTooltipContent = () => {
    const lastDate = alert.lastOccurrence ? alert.lastOccurrence.toLocaleDateString() : 'Unknown'
    return `${label}: ${alert.count} occurrence${alert.count > 1 ? 's' : ''} in last 7 days. Last occurrence: ${lastDate}`
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full border ${getBadgeStyle()}`}>
              {getIcon()}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Individual components for each alert type
export function HyperglycemiaBadge({ alert }: { alert: AlertStatus }) {
  return (
    <DetailedAlertBadge 
      alert={alert} 
      label="Hyperglycemia" 
      type="hyperglycemia" 
    />
  )
}

export function HyperglycemiaFrequentBadge({ alert }: { alert: AlertStatus }) {
  return (
    <DetailedAlertBadge 
      alert={alert} 
      label="Frequent Hyperglycemia" 
      type="hyperglycemiaFrequent" 
    />
  )
}

export function HyperglycemiaMajorBadge({ alert }: { alert: AlertStatus }) {
  return (
    <DetailedAlertBadge 
      alert={alert} 
      label="Major Hyperglycemia" 
      type="hyperglycemiaMajor" 
    />
  )
}

export function HypoglycemiaBadge({ alert }: { alert: AlertStatus }) {
  return (
    <DetailedAlertBadge 
      alert={alert} 
      label="Hypoglycemia" 
      type="hypoglycemia" 
    />
  )
}

export function HypoglycemiaFrequentBadge({ alert }: { alert: AlertStatus }) {
  return (
    <DetailedAlertBadge 
      alert={alert} 
      label="Frequent Hypoglycemia" 
      type="hypoglycemiaFrequent" 
    />
  )
}

export function HypoglycemiaMajorBadge({ alert }: { alert: AlertStatus }) {
  return (
    <DetailedAlertBadge 
      alert={alert} 
      label="Major Hypoglycemia" 
      type="hypoglycemiaMajor" 
    />
  )
}