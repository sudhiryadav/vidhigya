import { Injectable } from '@nestjs/common';
import { RedactingLogger } from '../logging';

export interface ConversationItem {
  question: string;
  answer: string;
  timestamp?: string;
}

export interface TokenizedConversationItem extends ConversationItem {
  questionTokens: number;
  answerTokens: number;
  totalTokens: number;
}

@Injectable()
export class ConversationContextService {
  private readonly logger = new RedactingLogger(
    ConversationContextService.name,
  );

  // Rough token estimation (1 token ≈ 4 characters for English text)
  private readonly CHARS_PER_TOKEN = 4;

  // Maximum tokens to allow for conversation history
  private readonly MAX_HISTORY_TOKENS = 1500; // Even more conservative limit

  // Maximum tokens for the entire context (history + current query)
  private readonly MAX_TOTAL_TOKENS = 2500; // Very conservative limit to stay well under 4096

  // Safety buffer to account for AI service token counting differences
  private readonly SAFETY_BUFFER = 1000; // 1000 token buffer

  /**
   * Intelligently truncate conversation history to fit within token limits
   * Uses a sliding window approach to keep the most recent and relevant messages
   */
  truncateConversationHistory(
    conversationHistory: ConversationItem[],
    currentQuery: string,
    documentContext?: string,
  ): {
    truncatedHistory: ConversationItem[];
    totalTokens: number;
    historyTokens: number;
    contextTokens: number;
    queryTokens: number;
    truncationInfo: {
      originalCount: number;
      truncatedCount: number;
      removedCount: number;
      reason: string;
    };
  } {
    if (!conversationHistory || conversationHistory.length === 0) {
      return {
        truncatedHistory: [],
        totalTokens: 0,
        historyTokens: 0,
        contextTokens: 0,
        queryTokens: 0,
        truncationInfo: {
          originalCount: 0,
          truncatedCount: 0,
          removedCount: 0,
          reason: 'No history provided',
        },
      };
    }

    // Calculate token counts
    const queryTokens = this.estimateTokens(currentQuery);
    const contextTokens = documentContext
      ? this.estimateTokens(documentContext)
      : 0;

    // Tokenize conversation history
    const tokenizedHistory = conversationHistory.map((item) => ({
      ...item,
      questionTokens: this.estimateTokens(item.question),
      answerTokens: this.estimateTokens(item.answer),
      totalTokens:
        this.estimateTokens(item.question) + this.estimateTokens(item.answer),
    }));

    // Calculate total tokens needed
    const totalHistoryTokens = tokenizedHistory.reduce(
      (sum, item) => sum + item.totalTokens,
      0,
    );
    const totalTokens = totalHistoryTokens + queryTokens + contextTokens;

    this.logger.log('Token calculation:', {
      totalHistoryTokens,
      queryTokens,
      contextTokens,
      totalTokens,
      maxHistoryTokens: this.MAX_HISTORY_TOKENS,
      maxTotalTokens: this.MAX_TOTAL_TOKENS,
      needsTruncation:
        totalTokens > this.MAX_TOTAL_TOKENS ||
        totalHistoryTokens > this.MAX_HISTORY_TOKENS,
    });

    // If we're within limits, return as-is
    if (
      totalTokens <= this.MAX_TOTAL_TOKENS &&
      totalHistoryTokens <= this.MAX_HISTORY_TOKENS
    ) {
      return {
        truncatedHistory: conversationHistory,
        totalTokens,
        historyTokens: totalHistoryTokens,
        contextTokens,
        queryTokens,
        truncationInfo: {
          originalCount: conversationHistory.length,
          truncatedCount: conversationHistory.length,
          removedCount: 0,
          reason: 'No truncation needed',
        },
      };
    }

    // Need to truncate - use sliding window approach
    const truncatedHistory = this.applySlidingWindowTruncation(
      tokenizedHistory,
      queryTokens,
      contextTokens,
    );

    const finalHistoryTokens = truncatedHistory.reduce(
      (sum, item) => sum + item.totalTokens,
      0,
    );
    const finalTotalTokens = finalHistoryTokens + queryTokens + contextTokens;

    // Final safety check - if we still exceed limits, truncate more aggressively
    if (finalTotalTokens > this.MAX_TOTAL_TOKENS) {
      this.logger.log(
        'Final safety check: Still exceeding total token limit, truncating more aggressively',
      );
      const safetyTruncatedHistory = this.emergencyTruncation(
        truncatedHistory,
        queryTokens,
        contextTokens,
      );
      const safetyHistoryTokens = safetyTruncatedHistory.reduce(
        (sum, item) => sum + item.totalTokens,
        0,
      );
      const safetyTotalTokens =
        safetyHistoryTokens + queryTokens + contextTokens;

      return {
        truncatedHistory: safetyTruncatedHistory.map(
          ({ question, answer, timestamp }) => ({
            question,
            answer,
            timestamp,
          }),
        ),
        totalTokens: safetyTotalTokens,
        historyTokens: safetyHistoryTokens,
        contextTokens,
        queryTokens,
        truncationInfo: {
          originalCount: conversationHistory.length,
          truncatedCount: safetyTruncatedHistory.length,
          removedCount:
            conversationHistory.length - safetyTruncatedHistory.length,
          reason: `Emergency truncation applied to fit within ${this.MAX_TOTAL_TOKENS} total tokens limit`,
        },
      };
    }

    return {
      truncatedHistory: truncatedHistory.map(
        ({ question, answer, timestamp }) => ({
          question,
          answer,
          timestamp,
        }),
      ),
      totalTokens: finalTotalTokens,
      historyTokens: finalHistoryTokens,
      contextTokens,
      queryTokens,
      truncationInfo: {
        originalCount: conversationHistory.length,
        truncatedCount: truncatedHistory.length,
        removedCount: conversationHistory.length - truncatedHistory.length,
        reason: `Truncated to fit within ${this.MAX_HISTORY_TOKENS} history tokens limit`,
      },
    };
  }

  /**
   * Apply sliding window truncation to keep most recent and relevant messages
   */
  private applySlidingWindowTruncation(
    tokenizedHistory: TokenizedConversationItem[],
    queryTokens: number,
    contextTokens: number,
  ): TokenizedConversationItem[] {
    const availableTokens = this.MAX_HISTORY_TOKENS;
    let currentTokens = 0;
    const selectedItems: TokenizedConversationItem[] = [];

    this.logger.log('Starting sliding window truncation:', {
      totalItems: tokenizedHistory.length,
      availableTokens,
      queryTokens,
      contextTokens,
    });

    // Start from the most recent messages (reverse order)
    for (let i = tokenizedHistory.length - 1; i >= 0; i--) {
      const item = tokenizedHistory[i];

      // Check if adding this item would exceed our limit
      if (currentTokens + item.totalTokens <= availableTokens) {
        selectedItems.unshift(item); // Add to beginning to maintain chronological order
        currentTokens += item.totalTokens;
        this.logger.log(
          `Added full item: ${item.question.substring(0, 50)}... (${item.totalTokens} tokens, total: ${currentTokens})`,
        );
      } else {
        // If this item is too large, try to fit just the question
        if (currentTokens + item.questionTokens <= availableTokens) {
          // Add just the question if we can fit it
          const truncatedItem = {
            ...item,
            answer: '[Previous answer truncated due to length]',
            answerTokens: this.estimateTokens(
              '[Previous answer truncated due to length]',
            ),
            totalTokens:
              item.questionTokens +
              this.estimateTokens('[Previous answer truncated due to length]'),
          };
          selectedItems.unshift(truncatedItem);
          currentTokens += truncatedItem.totalTokens;
          this.logger.log(
            `Added truncated item: ${item.question.substring(0, 50)}... (${truncatedItem.totalTokens} tokens, total: ${currentTokens})`,
          );
        } else {
          this.logger.log(
            `Skipped item: ${item.question.substring(0, 50)}... (${item.totalTokens} tokens, would exceed limit)`,
          );
        }
        break; // Stop here as we can't fit more
      }
    }

    this.logger.log('Sliding window truncation completed:', {
      selectedItemsCount: selectedItems.length,
      finalTokens: currentTokens,
      availableTokens,
    });

    return selectedItems;
  }

  /**
   * Emergency truncation method for when normal truncation still exceeds limits
   */
  private emergencyTruncation(
    history: TokenizedConversationItem[],
    queryTokens: number,
    contextTokens: number,
  ): TokenizedConversationItem[] {
    this.logger.log('Emergency truncation activated');

    // Calculate how many tokens we can afford for history
    const availableForHistory = Math.max(
      0,
      this.MAX_TOTAL_TOKENS - queryTokens - contextTokens - 500,
    ); // Leave 500 token buffer

    if (availableForHistory <= 0) {
      this.logger.log('No tokens available for history in emergency mode');
      return [];
    }

    let currentTokens = 0;
    const selectedItems: TokenizedConversationItem[] = [];

    // Take only the most recent items that fit
    for (let i = history.length - 1; i >= 0; i--) {
      const item = history[i];

      if (currentTokens + item.totalTokens <= availableForHistory) {
        selectedItems.unshift(item);
        currentTokens += item.totalTokens;
      } else {
        // Try to fit just the question
        if (currentTokens + item.questionTokens <= availableForHistory) {
          selectedItems.unshift({
            ...item,
            answer: '[Answer truncated]',
            answerTokens: this.estimateTokens('[Answer truncated]'),
            totalTokens:
              item.questionTokens + this.estimateTokens('[Answer truncated]'),
          });
          currentTokens +=
            item.questionTokens + this.estimateTokens('[Answer truncated]');
        }
        break;
      }
    }

    this.logger.log('Emergency truncation completed:', {
      selectedItemsCount: selectedItems.length,
      finalTokens: currentTokens,
      availableForHistory,
    });

    return selectedItems;
  }

  /**
   * Estimate token count for a given text
   * This is a rough approximation - in production you might want to use a proper tokenizer
   */
  private estimateTokens(text: string): number {
    if (!text || typeof text !== 'string') return 0;

    // Remove extra whitespace and count characters
    const cleanedText = text.trim().replace(/\s+/g, ' ');

    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is a conservative estimate that works well for most LLMs
    return Math.ceil(cleanedText.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Get conversation context summary for logging and monitoring
   */
  getContextSummary(
    conversationHistory: ConversationItem[],
    currentQuery: string,
    documentContext?: string,
  ): {
    historyLength: number;
    estimatedHistoryTokens: number;
    estimatedQueryTokens: number;
    estimatedContextTokens: number;
    estimatedTotalTokens: number;
    needsTruncation: boolean;
  } {
    const historyTokens = conversationHistory.reduce(
      (sum, item) =>
        sum +
        this.estimateTokens(item.question) +
        this.estimateTokens(item.answer),
      0,
    );
    const queryTokens = this.estimateTokens(currentQuery);
    const contextTokens = documentContext
      ? this.estimateTokens(documentContext)
      : 0;
    const totalTokens = historyTokens + queryTokens + contextTokens;

    return {
      historyLength: conversationHistory.length,
      estimatedHistoryTokens: historyTokens,
      estimatedQueryTokens: queryTokens,
      estimatedContextTokens: contextTokens,
      estimatedTotalTokens: totalTokens,
      needsTruncation:
        totalTokens > this.MAX_TOTAL_TOKENS ||
        historyTokens > this.MAX_HISTORY_TOKENS,
    };
  }

  /**
   * Pre-validate context before sending to AI service
   * This is the final check to ensure we never exceed token limits
   */
  validateContextBeforeSending(
    truncatedHistory: ConversationItem[],
    currentQuery: string,
    documentContext?: string,
  ): {
    isValid: boolean;
    totalTokens: number;
    maxAllowed: number;
    needsFurtherTruncation: boolean;
    finalHistory: ConversationItem[];
    reason: string;
  } {
    // Build the actual context that will be sent
    const contextToSend = this.buildContextString(
      truncatedHistory,
      currentQuery,
      documentContext,
    );

    // Estimate tokens for the final context
    const finalTokens = this.estimateTokens(contextToSend);
    const maxAllowed = 4096 - this.SAFETY_BUFFER; // 4096 - 1000 = 3096 tokens max

    this.logger.log('Pre-validation check:', {
      finalTokens,
      maxAllowed,
      exceedsLimit: finalTokens > maxAllowed,
      safetyBuffer: this.SAFETY_BUFFER,
      contextLength: contextToSend.length,
    });

    if (finalTokens <= maxAllowed) {
      return {
        isValid: true,
        totalTokens: finalTokens,
        maxAllowed,
        needsFurtherTruncation: false,
        finalHistory: truncatedHistory,
        reason: 'Context within limits',
      };
    }

    // If we still exceed, apply emergency truncation
    this.logger.log('Pre-validation failed: Applying emergency truncation');
    const emergencyHistory = this.emergencyTruncationForValidation(
      truncatedHistory,
      currentQuery,
      documentContext,
      maxAllowed,
    );

    const finalContext = this.buildContextString(
      emergencyHistory,
      currentQuery,
      documentContext,
    );
    const finalTokenCount = this.estimateTokens(finalContext);

    // If emergency truncation still fails, disable history completely
    if (finalTokenCount > maxAllowed) {
      this.logger.log(
        'Emergency truncation failed: Disabling conversation history completely',
      );
      return {
        isValid: true,
        totalTokens: this.estimateTokens(
          this.buildContextString([], currentQuery, documentContext),
        ),
        maxAllowed,
        needsFurtherTruncation: true,
        finalHistory: [], // No history at all
        reason: `History disabled due to token limit. Final tokens: ${this.estimateTokens(this.buildContextString([], currentQuery, documentContext))}`,
      };
    }

    return {
      isValid: finalTokenCount <= maxAllowed,
      totalTokens: finalTokenCount,
      maxAllowed,
      needsFurtherTruncation: true,
      finalHistory: emergencyHistory,
      reason: `Emergency truncation applied. Final tokens: ${finalTokenCount}`,
    };
  }

  /**
   * Build the actual context string that will be sent to the AI service
   */
  private buildContextString(
    history: ConversationItem[],
    query: string,
    documentContext?: string,
  ): string {
    let context = '';

    // Add document context if available
    if (documentContext) {
      context += `Document Context:\n${documentContext}\n\n`;
    }

    // Add conversation history
    if (history.length > 0) {
      context += 'Conversation History:\n';
      history.forEach((item, index) => {
        context += `Q${index + 1}: ${item.question}\n`;
        context += `A${index + 1}: ${item.answer}\n\n`;
      });
    }

    // Add current query
    context += `Current Question: ${query}`;

    return context;
  }

  /**
   * Emergency truncation specifically for pre-validation
   */
  private emergencyTruncationForValidation(
    history: ConversationItem[],
    query: string,
    documentContext?: string,
    maxAllowed: number = 3000,
  ): ConversationItem[] {
    this.logger.log('Emergency validation truncation activated');

    // Start with no history and add what we can
    const availableForHistory = Math.max(
      0,
      maxAllowed -
        this.estimateTokens(query) -
        (documentContext ? this.estimateTokens(documentContext) : 0) -
        200,
    );

    if (availableForHistory <= 0) {
      this.logger.log('No tokens available for history in validation mode');
      return [];
    }

    let currentTokens = 0;
    const selectedItems: ConversationItem[] = [];

    // Take only the most recent items that fit
    for (let i = history.length - 1; i >= 0; i--) {
      const item = history[i];
      const itemTokens =
        this.estimateTokens(item.question) + this.estimateTokens(item.answer);

      if (currentTokens + itemTokens <= availableForHistory) {
        selectedItems.unshift(item);
        currentTokens += itemTokens;
      } else {
        // Try to fit just the question
        const questionTokens = this.estimateTokens(item.question);
        if (currentTokens + questionTokens <= availableForHistory) {
          selectedItems.unshift({
            ...item,
            answer: '[Answer truncated for token limit]',
          });
          currentTokens +=
            questionTokens +
            this.estimateTokens('[Answer truncated for token limit]');
        }
        break;
      }
    }

    this.logger.log('Emergency validation truncation completed:', {
      selectedItemsCount: selectedItems.length,
      finalTokens: currentTokens,
      availableForHistory,
    });

    return selectedItems;
  }
}
