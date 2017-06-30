
const debug = require('debug')('quizar-domain');
import { QuizItem, WikiEntity } from '../entities';
import { Bluebird, _ } from '../utils';
import { UseCaseSet } from './use-case-set';
import { IRepository, ITopicCountRepository } from './repository';
import { WikiEntityUseCases } from './wiki-entity';
import { DataValidationError, DataConflictError, catchError } from '../errors';
import { IValidator } from '../entities/validator';

export class TopicUseCaseSet<T, R extends ITopicCountRepository<T>> extends UseCaseSet<T, R> {

    constructor(rep: R, validator: IValidator<T>, protected entityUseCases: WikiEntityUseCases, private countName: 'countQuizzes' | 'countQuizItems') {
        super(rep, validator);
    }

    setTopicCount(topicId: string): Bluebird<number> {
        return this.repository.countByTopicId(topicId)
            .then(count => {
                const obj = { id: topicId };
                obj[this.countName] = count;
                return this.entityUseCases.update(obj).then(() => count);
            });
    }

    prepareTopics(topics: WikiEntity[]) {
        const utopics = _.uniqBy(topics, 'id');
        if (utopics.length !== topics.length) {
            return Bluebird.reject(new DataValidationError({ message: '`topics` must contain unique items' }));
        }
        return Bluebird.resolve(topics);
    }
}
