import {
  BadGatewayException,
  Body,
  Controller,
  GatewayTimeoutException,
  Get,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type {
  AuthenticatedUser,
  DegreeRequirementsResponse,
} from '../shared/types';
import { AiPlannerService } from './ai-planner.service';
import { GeneralPromptDto } from './dto/general-prompt.dto';

export const sseHeartbeatIntervalMs = 15_000;

@Controller('ai-planner')
export class AiPlannerController {
  constructor(private readonly aiPlannerService: AiPlannerService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('prompt')
  async streamGeneralPrompt(
    @Body() generalPromptDto: GeneralPromptDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const abortController = new AbortController();
    const handleDisconnect = () => {
      if (!response.writableEnded) {
        abortController.abort();
      }
    };

    request.on('aborted', handleDisconnect);
    response.on('close', handleDisconnect);
    response.status(200);
    response.set({
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();

    const heartbeat = setInterval(() => {
      if (!response.writableEnded && !response.destroyed) {
        response.write(': keep-alive\n\n');
      }
    }, sseHeartbeatIntervalMs);

    try {
      for await (const delta of this.aiPlannerService.streamGeneralPrompt(
        generalPromptDto.prompt,
        abortController.signal,
      )) {
        writeSseEvent(response, 'delta', { text: delta });
      }

      if (!abortController.signal.aborted) {
        writeSseEvent(response, 'done', {});
      }
    } catch (error) {
      if (!abortController.signal.aborted && !response.destroyed) {
        writeSseEvent(response, 'error', {
          message: getSseErrorMessage(error),
        });
      }
    } finally {
      clearInterval(heartbeat);
      request.off('aborted', handleDisconnect);
      response.off('close', handleDisconnect);

      if (!response.writableEnded && !response.destroyed) {
        response.end();
      }
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('degree-requirements')
  getStoredDegreeRequirements(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DegreeRequirementsResponse | null> {
    return this.aiPlannerService.getStoredDegreeRequirements(user.id);
  }
}

function writeSseEvent(
  response: Response,
  event: 'delta' | 'done' | 'error',
  data: object,
) {
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function getSseErrorMessage(error: unknown) {
  if (error instanceof GatewayTimeoutException) {
    return 'The AI response timed out. Please try again.';
  }

  if (error instanceof ServiceUnavailableException) {
    return 'The AI service is temporarily unavailable. Please try again.';
  }

  if (error instanceof BadGatewayException) {
    return 'The AI service returned an invalid response. Please try again.';
  }

  return 'The AI response could not be generated. Please try again.';
}
