"use client";

import { Court } from "@/types/ecourts";
import {
  Building2,
  ChevronRight,
  Eye,
  Globe,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { useState } from "react";

interface CourtListProps {
  courts: Court[];
  isLoading?: boolean;
  onCourtSelect?: (courtId: string) => void;
  onViewDetails?: (courtId: string) => void;
}

export function CourtList({
  courts,
  isLoading = false,
  onCourtSelect,
  onViewDetails,
}: CourtListProps) {
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);

  const getCourtTypeColor = (type: string) => {
    switch (type) {
      case "SUPREME_COURT":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "HIGH_COURT":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "DISTRICT_COURT":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "SESSIONS_COURT":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "CIVIL_COURT":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "FAMILY_COURT":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "CONSUMER_COURT":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "LABOUR_COURT":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "REVENUE_COURT":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const handleCourtClick = (courtId: string) => {
    setSelectedCourt(selectedCourt === courtId ? null : courtId);
    onCourtSelect?.(courtId);
  };

  const handleViewDetails = (e: React.MouseEvent, courtId: string) => {
    e.stopPropagation();
    onViewDetails?.(courtId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (courts.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No courts found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Try adjusting your search criteria to find more courts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courts.map((court) => (
        <div
          key={court.id}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedCourt === court.id ? "ring-2 ring-blue-500" : ""
          }`}
          onClick={() => handleCourtClick(court.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {court.name}
                </h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getCourtTypeColor(court.type)}`}
                >
                  {court.type.replace("_", " ")}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {court.district}, {court.state}
                  </span>
                </div>

                {court.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{court.phone}</span>
                  </div>
                )}

                {court.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{court.email}</span>
                  </div>
                )}

                {court.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <a
                      href={court.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>

              {court.address && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{court.address}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={(e) => handleViewDetails(e, court.id)}
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="View Details"
              >
                <Eye className="w-5 h-5" />
              </button>
              <ChevronRight
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                  selectedCourt === court.id ? "rotate-90" : ""
                }`}
              />
            </div>
          </div>

          {/* Expanded Details */}
          {selectedCourt === court.id && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Court Information */}
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                    Court Information
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        ID:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {court.id}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        Type:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {court.type.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        District:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {court.district}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        State:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {court.state}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                    Contact Information
                  </h5>
                  <div className="space-y-2 text-sm">
                    {court.phone && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          Phone:
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {court.phone}
                        </span>
                      </div>
                    )}
                    {court.email && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          Email:
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {court.email}
                        </span>
                      </div>
                    )}
                    {court.website && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          Website:
                        </span>
                        <a
                          href={court.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {court.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              {court.address && (
                <div className="mt-6">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                    Address
                  </h5>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {court.address}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
