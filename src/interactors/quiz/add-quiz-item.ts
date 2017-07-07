
const debug = require('debug')('quizar-domain');
import { Bluebird, md5, _ } from '../../utils';
import { Quiz, WikiEntity, QuizItemInfo } from '../../entities';
import { QuizFields } from '../../entities/entity-fields';
import { Repository, RepAccessOptions, RepUpdateData, RepUpdateOptions } from '../repository';
import { BaseUseCase } from '../use-case';
import { DataValidationError, DataConflictError, DataNotFoundError } from '../../errors';
import { EntityCreate, EntityUpdate } from '../entity';
import { prepareTopics, formatPropertyEntities, notExistsQuizItems } from '../helpers';
import { QuizUpdate } from './update';

export type AddQuizItemData = {
    quizId: string
    info: QuizItemInfo
}

export class QuizAddQuizItem extends BaseUseCase<AddQuizItemData, boolean, null>{

    constructor(private repository: Repository<Quiz>, private updateQuiz: QuizUpdate) {
        super('QuizAddQuizItem');
    }

    protected innerExecute(data: AddQuizItemData): Bluebird<boolean> {
        debug('addQuizItemInfo start');
        const quizId = data.quizId;
        const info = data.info;

        return this.repository.getById(quizId, { fields: [QuizFields.id, QuizFields.items] }).then(quiz => {
            debug('addQuizItemInfo got quiz', quiz);
            if (!quiz) {
                debug('addQuizItemInfo not found quiz');
                return Bluebird.reject(new DataNotFoundError({ message: `Not found quiz id=${quizId}` }));
            }
            debug('addQuizItemInfo got quiz');
            quiz.items = quiz.items || [];

            const qii = _.findIndex(quiz.items, item => item.item.id === info.item.id);
            if (qii > -1) {
                return Bluebird.reject(new DataConflictError({ message: `Quiz id=${quizId} has an item with id=${info.item.id}` }));
            }
            quiz.items.push(info);
            debug('addQuizItemInfo updating quiz items');
            return this.updateQuiz.execute({ item: { id: quizId, items: quiz.items } }).return(true);
        });
    }
}