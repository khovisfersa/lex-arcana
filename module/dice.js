import { LexArcana } from "./config.js";

export class LexArcanaDice {
	static EXPRESSIONTYPE = { BALANCED: 0, UNBALANCED: 1 };
	static VALIDDICES = [20, 12, 10, 8, 6, 5, 4, 3];
	static ComputeNumDices = function(_numDice, _maxFaces)
	{
		let numDices = 0;
		let currentMaxFaces = _maxFaces;
		for(let current = 0;current<_numDice;++current)
		{
			const filterFaces = currentMaxFaces/(_numDice-current);
			const nextFace = this.VALIDDICES.find(value => value<=filterFaces);
			if(nextFace<(currentMaxFaces+1))
			{
				currentMaxFaces -= nextFace;
				++numDices;
			}
		}
		return numDices;
	}
	static #ComputeBalanced = function(_numDice, _maxFaces)
	{
		let currentMaxFaces = _maxFaces;
		let computedExpression = "";
		for(let current = 0;current<_numDice;++current)
		{
			const filterFaces = currentMaxFaces/(_numDice-current);
			const nextFace = this.VALIDDICES.find(value => value<=filterFaces);
			if(nextFace<(currentMaxFaces+1))
			{
				currentMaxFaces -= nextFace;
				computedExpression += (computedExpression!==''?'+':'')+'1d'+nextFace;
			}
		}
		return {expression: computedExpression, totalFaces: (_maxFaces-currentMaxFaces)};
	}
	static #ComputeUnbalanced = function(_numDice, _maxFaces)
	{
		let diceFaces = [];
		let sumDiceFaces = 0;
		let computedExpression = '';
		if(_maxFaces<3*_numDice)
		{
			--_numDice;
		}
		for(let i = 0;i<_numDice;++i)
		{
			diceFaces[i] = 3;
			sumDiceFaces += diceFaces[i];
		}
		let i = 0;
		let nMaxIterations = 12;
		while(sumDiceFaces<_maxFaces && --nMaxIterations>0)
		{
			const filterFaces = (_maxFaces-sumDiceFaces)+diceFaces[i];
			sumDiceFaces -= diceFaces[i];
			diceFaces[i] = this.VALIDDICES.find(value => value<=filterFaces);
			sumDiceFaces += diceFaces[i];
			i = (i+1)%_numDice;
		}
		for(i = 0;i<_numDice;++i)
		{
			computedExpression += (computedExpression!==''?'+':'')+'1d'+diceFaces[i];
		}
		return {expression: computedExpression, totalFaces: (_maxFaces-(_maxFaces-sumDiceFaces))};
	}

	static ComputeExpression = function(numDice, maxFaces, expressionType = LexArcanaDice.EXPRESSIONTYPE.BALANCED)
	{
		switch(expressionType)
		{
			case LexArcanaDice.EXPRESSIONTYPE.UNBALANCED: return LexArcanaDice.#ComputeUnbalanced(numDice, maxFaces);
			case LexArcanaDice.EXPRESSIONTYPE.BALANCED:
			default: return LexArcanaDice.#ComputeBalanced(numDice, maxFaces);
		}
	}

	/**
	 * Build the base chat message data
	 * @param {Actor|null} _actor
	 * @param {string} _info
	 */
	static #BaseMessage(_actor, _info)
	{
		return {
			speaker: ChatMessage.getSpeaker(_actor ? {actor: _actor} : {}),
			content: '<div class="LexArcanaRoll"><h1>'+foundry.utils.escapeHTML(_info ?? '')+'</h1>',
			sound: CONFIG.sounds.dice,
			rolls: []
		};
	}

	static #ErrorMessage(_message)
	{
		_message.content += '<p class="error">'+game.i18n.localize('LexArcana.InvalidRoll')+'</p>';
		_message.content += '</div>';
		delete _message.sound;
		return {result: 0, diceHasFated: false, message: _message, hasError: true};
	}

	static async #RollExpression(_expression, _difficultyThreshold = 6, _hasFateRoll = false, _totalFaces = null, _info = '', _actor = null)
	{
		const message = LexArcanaDice.#BaseMessage(_actor, _info);
		// accept expressions as 1d8, 2d4+1d12, 1d5, 1d6, 1d10, 1d20 etc.
		const diceFormulaRegExp = '^(([1-9][0-9]*)?d([34568]|(?:10)|(?:12)|(?:20)))(\\+(([1-9][0-9]*)?d([34568]|(?:10)|(?:12)|(?:20))))*';
		if(!_expression || !_expression.match(diceFormulaRegExp) || !Roll.validate(_expression))
		{
			return LexArcanaDice.#ErrorMessage(message);
		}
		let diceHasFated = false;
		let computedTotal = 0;

		let totalFaces = _totalFaces;
		if(totalFaces === null)
		{
			totalFaces = 0;
			const roll = new Roll(_expression);
			if(roll.dice.length===0)
			{
				return LexArcanaDice.#ErrorMessage(message);
			}
			roll.dice.forEach((die) => totalFaces+=die.number*die.faces);
		}
		let previousHasFated = false;
		let previousTotal = 0;
		do
		{
			const evaluatedRoll = await new Roll(_expression).evaluate();
			message.rolls.push(evaluatedRoll);
			diceHasFated = evaluatedRoll.total===totalFaces && _hasFateRoll;
			if(diceHasFated)
			{
				message.content+='<div class="fateroll">';
				message.content+='<p class="important">'+game.i18n.localize(CONFIG.LexArcana.FateRoll)+'!</p>';
			}
			computedTotal = evaluatedRoll.total + previousTotal;
			if(previousHasFated && !diceHasFated)
			{
				message.content+='<span class="la-result">'+game.i18n.localize(CONFIG.LexArcana.ResultName)+' <strong>'+computedTotal+'</strong> <em>('+previousTotal+'+'+evaluatedRoll.total+')</em></span>';
			}
			else if(!previousHasFated)
			{
				message.content+='<span class="la-result">'+game.i18n.localize(CONFIG.LexArcana.ResultName)+' <strong>'+computedTotal+'</strong></span>';
			}
			let expressionResult = '';
			evaluatedRoll.dice.forEach((die) => expressionResult+=die.total+' ');
			message.content+='<span class="details"> -&gt; '+_expression+' ( '+expressionResult+')</span>';

			message.content+='<hr/>';
			previousTotal = computedTotal;
			// post-process
			if(diceHasFated)
			{
				message.content+='</div>';
				previousHasFated = true;
			}
		}while(diceHasFated);
		message.content += '<div>';
		if(_difficultyThreshold>0)
		{
			if(computedTotal>_difficultyThreshold)
			{
				let difference = computedTotal-_difficultyThreshold-1;
				switch((difference-(difference%3))/3)
				{
					case 0: message.content += '<span class="DoS1">'+game.i18n.localize(CONFIG.LexArcana.DoSMarginalSuccess)+'</span>'; break;
					case 1: message.content += '<span class="DoS2">'+game.i18n.localize(CONFIG.LexArcana.DoSCompleteSuccess)+'</span>'; break;
					case 2:
					default: message.content += '<span class="DoS3">'+game.i18n.localize(CONFIG.LexArcana.DoSExceptionalSuccess)+'</span>'; break;
				}
			}
			else
			{
				message.content += '<span class="failure">'+game.i18n.localize(CONFIG.LexArcana.Failure)+'</span>';
			}
		}
		message.content+='<span class="details">'+game.i18n.localize(CONFIG.LexArcana.RollDetailsThreshold)+' "'+_difficultyThreshold+'"</span>';
		message.content += '</div>';

		message.content += '</div>';
		return {result: computedTotal, diceHasFated: diceHasFated, message: message, hasError: false};
	}

	/**
	 * Create the chat message, applying the current roll/message visibility mode.
	 * Foundry v14 replaced the "rollMode" setting by "messageMode" (and ChatMessage.applyRollMode by applyMode).
	 */
	static #CreateChatMessage = function(_message)
	{
		if(typeof ChatMessage.applyMode === 'function') ChatMessage.applyMode(_message);
		else ChatMessage.applyRollMode(_message, game.settings.get('core', 'rollMode'));
		return ChatMessage.create(_message);
	}

	static async #ComputedRoll(_numDice, _maxFaces, _expressionType = LexArcanaDice.EXPRESSIONTYPE.BALANCED, _difficultyThreshold = 6, _hasFateRoll = false, _info='', _actor = null)
	{
		let dice = LexArcanaDice.ComputeExpression(_numDice, _maxFaces, _expressionType);
		return LexArcanaDice.#RollExpression(dice.expression, _difficultyThreshold, _hasFateRoll, dice.totalFaces, _info, _actor);
	}

	static async RollFlat(_numDice, _maxFaces, _expressionType = LexArcanaDice.EXPRESSIONTYPE.BALANCED, _hasFateRoll = false, _info='', _actor = null)
	{
		let dice = LexArcanaDice.ComputeExpression(_numDice, _maxFaces, _expressionType);
		return LexArcanaDice.#RollExpression(dice.expression, -1, _hasFateRoll, dice.totalFaces, _info, _actor);
	}

	static async Roll(_numDice, _maxFaces, _expressionType = LexArcanaDice.EXPRESSIONTYPE.BALANCED, _difficultyThreshold = 6, _hasFateRoll = false, _info='', _actor = null)
	{
		let res = await LexArcanaDice.#ComputedRoll(_numDice, _maxFaces, _expressionType, _difficultyThreshold, _hasFateRoll, _info, _actor);
		return LexArcanaDice.#CreateChatMessage(res.message);
	}

	static async RollExpression(_expression, _difficultyThreshold = 6, _hasFateRoll = false, _info='', _actor = null)
	{
		let res = await LexArcanaDice.#RollExpression(_expression, _difficultyThreshold, _hasFateRoll, null, _info, _actor);
		return LexArcanaDice.#CreateChatMessage(res.message);
	}
};
